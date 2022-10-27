import Bot from '@nftartloans/js';
import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import { PubSub } from "@google-cloud/pubsub";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { MongoClient, ServerApiVersion } from "mongodb";
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
    const maxMessages = 50;
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
  console.log("[INFO] Listings before filter: ", listings.length)
  // Filter for allowed listings
  listings = bot.projects.allowlist.filter({
    listings
  })
  console.log("[INFO] Listings after project filter: ", listings.length)
  listings = await Promise.all(listings.map(async function(listing) {
    const nft = { address: listing.nft.address, id: listing.nft.id }
    const project = bot.projects.get({ nft })
    const metadata = await bot.projects.stats.metadata({ 
      nft, opensea: { api: { key: secrets?.opensea?.api?.key } }
    })
    listing['project'] = project;
    listing['metadata'] = metadata;
    return listing;
  }))
  listings = listings.filter(function(listing) {
    let valid = true;
    let errors = {};
    if (listing?.project?.collection?.slug != listing?.metadata?.opensea?.collection?.slug) {
      valid = false;
      errors['metadata.opensea.collection.slug'] = ['NFT is not part of allowlist'];
    }
    if (!listing?.metadata?.opensea?.supports_wyvern || listing?.metadata?.opensea?.supports_wyvern == false) {
      valid = false;
      errors['metadata.opensea.supports_wyvern'] = ['NFT not tradable on Opensea'];
    }
    // if (!listing?.metadata?.looksrare?.tradable || listing?.metadata?.looksrare?.tradable == false) {
    //   valid = false;
    //   errors['metadata.looksrare.tradable'] = ['NFT not tradable on Opensea'];
    // }
    if(Object.keys(errors).length > 0) {
      console.log('[ERROR]', JSON.stringify(errors));
      console.log('[INFO]', JSON.stringify(listing?.nft));
    }
    return valid;
  })
  console.log("[INFO] Listings after slug filter: ", listings.length)
  // // Filter for listings that don't have offers
  // // Get existing offers
  // const offers = await bot.nftfi.offers.get()
  // const offersNftKeys = offers.map(function(offer) {
  //   return `${offer.nft.address}-${offer.nft.id}`
  // })
  // listings = listings.filter(function(listing) {
  //   const nftKey = `${listing.nft.address}-${listing.nft.id}`;
  //   const offerExists = offersNftKeys.includes(nftKey);
  //   if (offerExists) {
  //     console.log(`Offer exists for ${nftKey}, filtering out.`)
  //   }
  //   return !offerExists;
  // })
  // Send listings to pubsub topic
  publishListings(listings)
  console.log("Done.")
  return true;
}