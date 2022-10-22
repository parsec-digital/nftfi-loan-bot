import Bot from '@nftartloans/js';
import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import { PubSub } from "@google-cloud/pubsub";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { MongoClient, ServerApiVersion } from "mongodb";
import ethers from "ethers";

// Init mode
// const mode = process.env?.MODE || 'dev';
const mode = "prod";
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

// Init pubsub
let pubsubClient = undefined;
async function initPubsubClient() {
  if(!pubsubClient) {
    pubsubClient = new PubSub();
  }
}

// Publish listings
const publishListings = function(listings) {
  if (listings.length > 0) {
    const topicId = process.env.OUTPUT_TOPIC_ID
    const maxMessages = 10;
    const maxWaitTime = 10000;
    const publisher = pubsubClient.topic(topicId, {
      batching: {
        maxMessages: maxMessages,
        maxMilliseconds: maxWaitTime,
      }
    })
    for (const listing of listings) {
      publisher
        .publish(Buffer.from(JSON.stringify(listing)))
        .then(results => {
          console.log(`Message ${results} published.`);
        })
        .catch(err => {
          console.error('Error publishing message:', err);
        });
    }
  } else {
    console.log("No listings available.")
  }
}

// Handle event
export const handle = async function (event) {
  // Init Secrets
  await initSecrets()
  // Init Mongo
  await initMongo()
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
  const allowlist = bot.projects.allowlist.get();
  const allowedAddresses = Array.from(new Set(allowlist.map(function(project) {
    return project.contract.address;
  })));
  // Get listings
  let listings = await bot.listings.get({
    filters: {
      nft: {
        addresses: allowedAddresses
      },
      nftfi: {
        contract: {
          name: "v2-1.loan.fixed"
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
  publishListings(listings)
  console.log("Done.")
  return true;
}