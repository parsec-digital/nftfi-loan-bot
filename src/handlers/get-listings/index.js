import Bot from '@nftartloans/js';
import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import { PubSub } from "@google-cloud/pubsub";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import ethers from "ethers";

// Init mode
const mode = process.env?.MODE || 'dev';
console.log('-->', JSON.stringify(process.env), mode)

// Init secrets
let secrets = undefined;
async function initSecrets() {
  if (!secrets) {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: `projects/config-platform-363618/secrets/nftfi-loan-bot--${mode}/versions/2`,
    });
    secrets = JSON.parse(version.payload.data.toString());
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
      bot: { config: { mode } },
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

// Init pubsub
let pubsubClient = undefined;
async function initPubsubClient() {
  if(!pubsubClient) {
    pubsubClient = new PubSub();
  }
}

// Publish pubsub msg
async function publishMessage(data) {
  const dataBuffer = Buffer.from(data);
  try {
    const topicId = process.env.OUTPUT_TOPIC_ID
    const messageId = await pubsubClient
      .topic(topicId)
      .publishMessage({data: dataBuffer});
    console.log(`Message ${messageId} published. ${data}`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

// Handle event
export const handle = async function (event) {
  // Init Secrets
  await initSecrets()
  // Init Bot
  await initBot()
  // Init Topic
  await initPubsubClient()
  // Get existing offers
  const offers = await bot.nftfi.offers.get()
  const offersNftKeys = offers.map(function(offer) {
    return `${offer.nft.address}-${offer.nft.id}`
  })
  // Allowed addresses
  const allowedAddresses = {
    dev: [
      '0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b' // paradigm
    ],
    prod: [
      '0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270',
      '0x059edd72cd353df5106d2b9cc5ab83a52287ac3a',
      '0xc143bbfcdbdbed6d454803804752a064a622c1f3', // Grifters by XCOPY
      '0xaadc2d4261199ce24a4b0a57370c4fcf43bb60aa', // Damien Hurst - The Currency
      '0xd92e44ac213b9ebda0178e1523cc0ce177b7fa96', // BEEPLE: EVERYDAYS - THE 2020 COLLECTION
      '0x27787755137863bb7f2387ed34942543c9f24efe', // Factura by Mathias Isaksen
      '0xbdde08bd57e5c9fd563ee7ac61618cb2ecdc0ce0', // CryptoGalactican
      '0x892848074ddea461a15f337250da3ce55580ca85', // CyberBrokers
      '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', // Doodles
      '0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7', // Meebits
      '0x466cfcd0525189b573e794f554b8a751279213ac', // the-dooplicator
      '0xb396b8699f728735f28a31279d07b1d0d2411baa', // hackatao
      '0xecf7ef42b57ee37a959bf507183c5dd6bf182081', // josie
      '0x670d4dd2e6badfbbd372d0d37e06cd2852754a04', // super-cool-world
      '0x64780ce53f6e966e18a22af13a2f97369580ec11', // petro-national-by-john-gerrard
      '0x620b70123fb810f6c653da7644b5dd0b6312e4d8', // space-doodles-official
      '0xd78afb925a21f87fa0e35abae2aead3f70ced96b-1', // grails
    ]
  }
  // Get listings
  let listings = await bot.listings.get({
    filters: {
      nft: {
        addresses: allowedAddresses[mode]
      },
      nftfi: {
        contract: {
          name: "v2.loan.fixed"
        }
      }
    },
    pagination: {
      limit: 10000,
      page: 1
    }
  });
  // Filter for allowed listings
  listings = bot.projects.allowlist.filter({
    listings
  })
  // Filter for listings that don't have offers
  listings = listings.filter(function(listing) {
    const nftKey = `${listing.nft.address}-${listing.nft.id}`;
    const offerExists = offersNftKeys.includes(nftKey);
    if (offerExists) {
      console.log(`Offer exists for ${nftKey}, filtering out.`)
    }
    return !offerExists;
  })
  // Send listings to pubsub topic
  if (listings.length > 0) {
    for (const listing of listings) {
      const data = JSON.stringify(listing)
      publishMessage(data)
    }
  } else {
    console.log("No allowed listings available.")
  }
  console.log("Done.")
  return true;
}