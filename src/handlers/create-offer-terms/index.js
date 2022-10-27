import Bot from '@nftartloans/js';
import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import { PubSub } from "@google-cloud/pubsub";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { MongoClient, ServerApiVersion } from "mongodb";
import bunyan from 'bunyan';
import { LoggingBunyan } from '@google-cloud/logging-bunyan';
import ethers from "ethers";

// Init mode
const mode = process.env?.MODE || 'dev';

// Init secrets
let secrets = undefined;
async function initSecrets() {
  if (!secrets) {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: `projects/config-platform-363618/secrets/nftfi-loan-bot--${mode}/versions/latest`,
    });
    secrets = JSON.parse(version.payload.data.toString());
  }
}

let logger = undefined;
const initLogger = function () {
  if (!logger) {
    try {
      const loggingBunyan = new LoggingBunyan();
      logger = bunyan.createLogger({
        name: `create-offer-terms-${mode}`,
        streams: [{ stream: process.stdout, level: 'info' }, loggingBunyan.stream('info')]
      });
    } catch (e) {
      console.log(e);
    }
  }
};

// Init Mongo
let mongo = undefined;
async function initMongo() {
  if(!mongo) {
    const uri = secrets.mongo.readonly.uri;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    await client.connect();
    mongo = client.db(secrets.mongo.readonly.db)
  }
}

// Init bot
let bot = undefined;
async function initBot () {
  if (!bot) {
    // Init provider
    const provider = ethers.providers.getDefaultProvider(secrets.providerUrl);
    // Init signer
    let signer = new GcpKmsSigner(secrets.kmsCredentials);
    signer = signer.connect(provider);
    // Init Bot
    bot = await Bot.init({
      bot: { 
        config: { mode },
        dependencies: {
          mongo
        } 
      },
      nftfi: {
        config: { api: { key: secrets.apiKey } },
        ethereum: { 
          provider: { url: secrets.providerUrl },
          account: { multisig: { gnosis: { safe: { 
            address: secrets.gnosisSafeAddress,
            owners: { signers: [signer] } 
          }}}}
        }
      }
    });
  }
}

let pubsubClient = undefined;
async function initPubsubClient() {
  if(!pubsubClient) {
    pubsubClient = new PubSub();
  }
}

async function publishMessage(data) {
  const dataBuffer = Buffer.from(data);
  try {
    const topicId = process.env.OUTPUT_TOPIC_ID
    const messageId = await pubsubClient
      .topic(topicId)
      .publishMessage({data: dataBuffer});
    console.log(`Message ${messageId} published. ${JSON.stringify(data)}`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

export const handle = async function (event) {
  // Init Logger
  initLogger()
  // Init Secrets
  await initSecrets()
  // Init Mongo
  await initMongo()
  // Init Bot
  await initBot()
  // Init Topic
  await initPubsubClient()
  // Prepare listing
  let listing;
  if (!event.data) {
    listing = {"id":"MHhjMTQzYmJmY2RiZGJlZDZkNDU0ODAzODA0NzUyYTA2NGE2MjJjMWYzLzE4NjE0","date":{"listed":"2022-07-08T08:22:56.083Z"},"nft":{"id":"2850","address":"0x23581767a106ae21c074b2276D25e5C3e136a68b","name":"Moonbirds #2850","project":{"name":"Moonbirds"}},"borrower":{"address":"0x6f213390f1913292555ed588de754e79a266049a"},"terms":{"loan":{"duration":null,"repayment":null,"principal":null,"currency":null}},"nftfi":{"contract":{"name":"v2-1.loan.fixed"}}}
  } else {
    listing = JSON.parse(Buffer.from(event.data, 'base64').toString())
  }
  let errors = [];
  let offer;
  let exception;
  try {
    // Construct the loan terms
    const currency = bot.nftfi.config.erc20.weth.address;
    const nft = { address: listing.nft.address, id: listing.nft.id }
    const project = bot.projects.get({ nft })
    const stats = bot.projects.stats.get({ project })
    if (stats?.data) {
      const floorPrice = bot.prices.getFloorPrice({ stats: stats.data })
      const ltv = bot.prices.getLTV({ stats: stats.data });
      const apr = bot.prices.getAPR({ ltv });
      const principal = (floorPrice * ltv).toString();
      const days = 30;
      const repayment = bot.nftfi.utils.calcRepaymentAmount(principal, apr, days).toString();
      const duration = 86400 * days; // Number of days (loan duration) in seconds
      const expiry = (3600 * 1) + 900 // 1 hours, 15 minutes
      offer = {
        terms: {
          expiry,
          principal,
          repayment,
          duration,
          currency,
          ltv,
          apr
        },
        metadata: {
          floorPriceETH: bot.nftfi.utils.formatEther(floorPrice),
          principalETH: bot.nftfi.utils.formatEther(principal),
          repaymentETH: bot.nftfi.utils.formatEther(repayment)
        },
        nft: listing.nft,
        borrower: listing.borrower,
        nftfi: listing.nftfi
      };
      offer.nft['project'] = listing.nft.project;
      offer.nft.project['floorPrice'] = floorPrice.toString();
  
      // error handling
      const priceValidation = bot.prices.validate({ stats: stats.data })
      const balance = await bot.nftfi.erc20.balanceOf({
        token: { address: currency }
      });
      const principalWei = ethers.BigNumber.from(principal.toString())
      const sufficientBalance = balance.gte(principalWei)
      if (priceValidation.valid == false) {
        errors.push(priceValidation.errors);
      }
      if (!sufficientBalance) {
        errors.push({'terms.principal': ['Insufficient balance to create offer']})
      }
      // If no errors, send for offer execution
      if (errors.length == 0) {
        const data = JSON.stringify(offer)
        await publishMessage(data)
      }
    } else {
      errors.push({'stats': ['Could not pull stats for NFT']})
    }
  } catch (e) {
    exception = e.message;
  } finally {
    logger.info({
      listing,
      offer,
      errors,
      exception
    })
  }
  return true;
}