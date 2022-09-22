import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import ethers from "ethers";
import NFTfi from "@nftfi/js";

// Init secrets
const secrets = {
  apiKey: 'AIzaSyCAq5PokwMfIJKDYR5kpU9fH3BxtPwPM3k',
  gnosisSafeAddress: '0xf7F87d0236CC863D10870f7373D83Cceeb0D56A8',
  providerUrl: 'https://eth-goerli.g.alchemy.com/v2/t2TpJaiQHHMeBL1cEZH8CNUDkgBdND_9',
  kmsCredentials: {
    projectId: "key-platform",
    locationId: "global",
    keyRingId: "nft-art-loans-1db8b31",
    keyId: "signer--1-430c52e",
    keyVersion: "1",
  }
}

// Init provider
const provider = ethers.providers.getDefaultProvider(secrets.providerUrl);

// Init NFTfi
let nftfi = undefined;
async function initNFTfi (env) {
  // Init signer
  let signer = new GcpKmsSigner(secrets.kmsCredentials);
  signer = signer.connect(provider);
  nftfi = nftfi || await NFTfi.init({
    config: { api: { key: secrets.apiKey } },
    ethereum: { 
      provider: { url: secrets.providerUrl },
      account: { multisig: { gnosis: { safe: { 
        address: secrets.gnosisSafeAddress,
        owners: { signers: [signer] } 
      }}}},
    }
  });
}

// Handle event
export const handle = async function (event) {
  try {
    // Init NFTfi
    await initNFTfi()
    // Prepare payload
    let payload;
    if (!event.data) {
      payload = {"nft":{"id":"1122372","address":"0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b"},"borrower":{"address":"0x5bd000ae659d81251426be803b18757fccdd9daf"},"terms":{"duration":2592000,"repayment":"5100000000000000","principal":"5000000000000000","currency":"0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6","expiry":1695158376},"nftfi":{"contract":{"name":"v2.loan.fixed"}}}
    } else {
      payload = JSON.parse(Buffer.from(event.data, 'base64').toString())
    }
    console.log("-->", payload)
    // Create signed offer
    let offer = await nftfi.offers.create({
      terms: payload.terms,
      nft: payload.nft,
      borrower: payload.borrower,
      nftfi: payload.nftfi
    });
    // Append multisig info
    offer['multisig'] = {
      gnosis: {
        safe: {
          address: await nftfi.account.getAddress(),
          signer: {
            address: await nftfi.account.getAuthAddress()
          }
        }
      }
    }
    // Info
    console.log("-->", JSON.stringify(offer))
  } catch (e) {
    console.error(e)
  }
};