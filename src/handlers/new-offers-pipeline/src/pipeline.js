import ethers from 'ethers';
import { getLTV, getAPR, getDuration } from '../shared/offers.js';

export function getAllowedNFTAddresses(options) {
  const allowlist = options.bot.projects.allowlist.get()
  const allowedNFTAddresses = Array.from(new Set(allowlist.map(function(project) {
    return project.contract.address;
  })));
  console.log("allowed NFTs:", allowedNFTAddresses.length)
  return allowedNFTAddresses;
}

export async function getListings(options) {
  const bot = options.bot;
  const listings = await bot.listings.get({
    filters: {
      nft: {
        addresses: options.allowedNFTAddresses
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
  console.log("listings:", listings.length)
  return listings;
}

export async function getExistingOffers(options) {
  const bot = options.bot;
  const offers = await bot.nftfi.offers.get()
  console.log("existing offers:", offers.length)
  return offers;
}

export function getListingsWithoutOffers(options) {
  const listings = options.listings;
  const offers = options.offers;
  let listingsWithoutOffers = listings.filter(function(listing) {
    const hasoffers = offers.filter(function(offer) {
      return listing.nft.address == offer.nft.address && listing.nft.id == offer.nft.id;
    })
    return !hasoffers.length;
  })
  console.log("listings without offers:", listingsWithoutOffers.length);
  return listingsWithoutOffers;
}

export async function addListingInfo(options) {
  let listings = options.listings;
  let secrets = options.secrets;
  let bot = options.bot;
  listings = await Promise.all(listings.map(async function(listing) {
    const nft = { address: listing.nft.address, id: listing.nft.id }
    const project = bot.projects.get({ nft })
    const stats = bot.projects.stats.get({ project })
    const metadata = await bot.projects.stats.metadata({ 
      nft, opensea: { api: { key: secrets?.opensea?.api?.key } }
    })
    listing['project'] = project;
    listing['stats'] = stats;
    listing['metadata'] = metadata;
    return listing;
  }))
  console.log("listings with exta info:", listings.length);
  return listings;
}

export function getAllowedListings(options) {
  let listings = options.listings;
  const bot = options.bot;
  listings = bot.projects.allowlist.filter({
    listings
  })
  console.log("listings after allowlist check:", listings.length)
  listings = listings.filter(function(listing) {
    let valid = true;
    let errors = {};
    if (listing?.project?.collection?.slug != listing?.metadata?.opensea?.collection?.slug) {
      valid = false;
      errors['metadata.opensea.collection.slug'] = ['NFT is not part of allowlist'];
    }
    return valid;
  })
  console.log("listings after collection slug check:", listings.length)
  listings = listings.filter(function(listing) {
    let valid = true;
    let errors = {};
    if (!listing?.metadata?.opensea?.supports_wyvern || listing?.metadata?.opensea?.supports_wyvern == false) {
      valid = false;
      errors['metadata.opensea.supports_wyvern'] = ['NFT not tradable on Opensea'];
    }
    return valid;
  })
  console.log("listings after wyvern check:", listings.length)
  listings = listings.filter(function(listing) {
    let valid = true;
    let errors = {};
    let stats = listing?.stats?.data;
    if (stats.floor_price >= (stats.thirty_day_average_price * 3)) {
      valid = false;
      errors['floor_price'] = ['stats.floor_price >= (stats.thirty_day_average_price * 3)']
    }
    return valid;
  })
  console.log("listings after stats.floor_price >= (stats.thirty_day_average_price * 3) check:", listings.length)
  listings = listings.filter(function(listing) {
    let valid = true;
    let errors = {};
    let stats = listing?.stats?.data;
    if (stats.thirty_day_sales == 0) {
      valid = false;
      errors['thirty_day_sales'] = ['stats.thirty_day_sales == 0']
    }
    return valid;
  })
  console.log("listings after thirty_day_sales check:", listings.length)
  listings = listings.filter(function(listing) {
    let valid = true;
    let errors = {};
    let stats = listing?.stats?.data;
    if (stats.floor_price <= 0.1) {
      valid = false;
      errors['floor_price'] = ['stats.floor_price <= 0.1']
    }
    return valid;
  })
  console.log("listings after floor_price check:", listings.length)
  return listings;
}

export function constructOffers(options) {
  let bot = options.bot;
  let listings = options.listings;
  let offers = listings.map(function(listing) {
    let offer = {};
    const currency = bot.nftfi.config.erc20.weth.address;
    const stats = listing?.stats?.data;
    if (stats) {
      const floorPrice = bot.prices.getFloorPrice({ stats });
      const ltv = getLTV({ bot, listing, stats });
      const apr = getAPR({ bot, listing, ltv }); 
      const principal = (floorPrice * ltv).toString();
      const duration = getDuration({ listing }) // Number of days (loan duration) in seconds
      const days = duration / 86400;
      const repayment = bot.nftfi.utils.calcRepaymentAmount(principal, apr, days).toString();
      const expiry = (3600 * 3) + 900 // 3 hours, 15 minutes
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
    }
    return offer;
  })
  return offers;
}

export async function getValidOffers(options) {
  let bot = options.bot;
  let balance = await bot.nftfi.erc20.balanceOf({
    token: { address: bot.nftfi.config.erc20.weth.address }
  });
  let offers = options.offers;
  offers = offers.filter(function(offer) {
    const principalWei = ethers.BigNumber.from(offer.terms.principal.toString())
    const sufficientBalance = balance.gte(principalWei)
    return sufficientBalance;
  })
  console.log("offers after sufficient balance check:", offers.length)
  return offers;
}

export async function executeOffers(options) {
  const logger = options.logger;
  const bot = options.bot;
  let offers = options.offers;
  offers = await Promise.all(offers.map(async function(offer) {
    try {
      offer['execution'] = await bot.nftfi.offers.create({
        terms: offer.terms,
        nft: offer.nft,
        borrower: offer.borrower,
        nftfi: offer.nftfi
      });
      offer['multisig'] = {
        gnosis: {
          safe: {
            address: await bot.nftfi.account.getAddress(),
            signer: {
              address: await bot.nftfi.account.getAuthAddress()
            }
          }
        }
      }
    } catch (e) {
      offer['exception'] = e.message;
    } finally {
      logger.info({ offer });
    }
    return offer;
  }))
  console.log(`executed ${offers.length} offers`)
  return offers;
}