import shared from '@nftartloans/shared';
import { 
  getListings,
  getAllowedNFTAddresses,
  getExistingOffers,
  getListingsWithoutOffers,
  addListingInfo,
  getAllowedListings,
  constructOffers,
  getValidOffers,
  executeOffers
} from './src/pipeline.js'

// Init mode
const mode = process?.env?.MODE || 'dev';

// Init secrets
const secrets = await shared.secrets.init({ mode });

// Init Mongo
const mongo = await shared.mongo.init({ secrets });

// Init bot
const bot = await shared.bot.init({
  mode,
  secrets,
  mongo
});

// Init logger
const logger = await shared.logger.init({
  name: 'new-offers-pipeline',
  mode
});

export const handle = async function (event) {
  let allowedNFTAddresses = getAllowedNFTAddresses({ bot });
  // let offers = await getExistingOffers({ bot });
  let listings = await getListings({ bot, allowedNFTAddresses });
  // listings = getListingsWithoutOffers({ listings, offers });
  listings = await addListingInfo( { bot, listings, secrets });
  listings = getAllowedListings({ bot, listings })
  let offers = constructOffers({ bot, listings })
  offers = await getValidOffers({ bot, offers })
  offers = await executeOffers({ bot, offers, logger })
  console.log('done.');
  return true;
}