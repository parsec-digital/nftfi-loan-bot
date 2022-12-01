const borrowerConfig = {
  '0x7c00c9f0e7aed440c0c730a9bd9ee4f49de20d5c': { // KrypTonik
    '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e': { // Doodles Official
      ltv: 0.75,
      apr: 40,
      duration: 259200 // 3 days
    }
  }
}

function _getBorrowerConfig(options) {
  let config;
  const nft = options.nft;
  const borrower = options.borrower;
  const nftAddress = nft.address.toLowerCase();
  const borrowerAddress = borrower.address.toLowerCase();
  config = borrowerConfig[borrowerAddress];
  config = (config) ? config[nftAddress] : undefined;
  return config;
}

export function getLTV(options) {
  const bot = options.bot;
  const stats = options.stats;
  const listing = options.listing;
  const nft = listing.nft;
  const borrower = listing.borrower;
  const config = _getBorrowerConfig({ borrower, nft })
  const ltv = (config?.ltv) ? config.ltv : bot.prices.getLTV({ stats });
  return ltv;
}

export function getAPR(options) {
  const bot = options.bot;
  const ltv = options.ltv;
  const listing = options.listing;
  const nft = listing.nft;
  const borrower = listing.borrower;
  const config = _getBorrowerConfig({ borrower, nft })
  const apr = (config?.apr) ? config.apr : bot.prices.getAPR({ ltv });
  return apr;
}

export function getDuration(options) {
  const days = options.days;
  const listing = options.listing;
  const nft = listing.nft;
  const borrower = listing.borrower;
  const config = _getBorrowerConfig({ borrower, nft });
  const duration = (config?.duration) ? config.duration : 86400 * 30;
  return duration;
}