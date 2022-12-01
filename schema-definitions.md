**Admin Safe**
   * Is a Gnosis Safe
   * Uses multiple devices to confirm transactions (multisig)
   * Owns the Loans Safe, Liquidation Safe, and Transaction Guard
   * Can perform admin operations on itself and all children safes and guards
**Loans Safe**
   * Is a Gnosis Safe
   * Uses multiple devices to confirm transactions (multisig)
   * Stores the ERC20s used as principal for loans on NFTfi
   * Allows NFTfi loans contracts to send ERC20 principals to borrowers
   * Holds NFTfi Promissory Notes
   * Delegates offer signing permissions to Bot
**Liquidation Safe**
   * Is a Gnosis Safe
   * Uses multiple devices to confirm transactions (multisig)
   * Used to store NFTs from foreclosed loans on NFTfi
   * Interacts with Opensea (or other marketplaces) to sell NFTs
   * Sends profits back to Loans Safe
**Transaction Guard**
   * Is a smart contract
   * Is implemented by the Loans Safe
   * Is owned by Admin Safe
   * Targets one or many delegates (Bots)
   * Blocks any transactions for given delegates (Bots)
   * Essentially prevents bots from being compromised and used to divert funds
**Borrower**
   * Provides NFTs as collateral to NFTfi loans contracts
   * Receives ERC20 principals from Loans Safe
   * Repays loans directly with NFTfi loans contracts
**Bot**
   * Is a suite of automated offer scripts
   * Scans NFTfi for new listings
   * Determines which listings are eligible for offers (allowlist, suspicious, allowance, balance, etc...)
   * Creates terms of offer(s) for each listing
   * Adapts offers to be competitive vs competing offers
   * Uses associated HSM to sign offers on behalf of Trading Account
   * Submits offers to NFTfi on behalf of Trading Account
   * Cannot perform any transactions on trading account (moving funds, changing permissions, etc...)
   * Code is secured via MFA, and IAM
   * Code is isolated to it's own project
**HSM**
    * Hardware Security Module
    * FIPS 140-2 Level 3 certified - https://csrc.nist.gov/publications/detail/fips/140/2/final
    * GCP managed and hosted
    * Performs ECDSA cryptographic operations
    * Private Keys are generated and stored directly on HSM and are unknown to any external entity (including owners)
    * Keys are secured via HSM, MFA, and IAM
    * Keys are isolated to their own project