import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import ethers from "ethers";
import NFTfi from "@nftfi/js";

const kmsCredentials = {
  projectId: "key-platform", // your project id in gcp
  locationId: "global", // the location where your key ring was created
  keyRingId: "nft-art-loans-1db8b31", // the id of the key ring
  keyId: "pk--nft-art-loans--1-6181a53", // the name/id of your key in the key ring
  keyVersion: "1", // the version of the key
};
const providerUrl = "https://eth-goerli.g.alchemy.com/v2/t2TpJaiQHHMeBL1cEZH8CNUDkgBdND_9";
const provider = ethers.providers.getDefaultProvider(providerUrl);
let signer = new GcpKmsSigner(kmsCredentials);
signer = signer.connect(provider);
// const pk = "0x37e85c9894edc1a97dc34624b97a1b4c18921b188b2945966ac68ff47521f622"
// const signer = new ethers.Wallet(pk, provider)
let nftfi = undefined;

async function initNFTfi () {
  nftfi = nftfi || await NFTfi.init({
    config: { api: { key: 'AIzaSyCAq5PokwMfIJKDYR5kpU9fH3BxtPwPM3k' } },
    ethereum: {
      account: {  
        multisig: { 
          gnosis: {
            safe: { 
              address: '0x03767D5bD4691a34567F36414eF4f446803267ef',
              owners: { signers: [signer] } 
            }
          }
        }
      },
      provider: { url: providerUrl }
    }
  });
}

export const handle = async function (event) {
  await initNFTfi()
  const payload = JSON.parse(Buffer.from(event.data, 'base64').toString())
  let offer = await nftfi.offers.create({
    terms: {
      duration: 2592000,
      repayment: 1131643835616438400,
      principal: 1100000000000000000,
      currency: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      expiry: 1694300527
    },
    nft: {
      id:"121",
      address:"0x64780ce53f6e966e18a22af13a2f97369580ec11"
    },
    borrower: {
      address: "0x3e8a6726f43e6a7470ff2c99db5b73a2f81afb3d"
    },
    nftfi: {
      contract:{
        name:"v2.loan.fixed"
      }
    },
    simulation: {
      dryRun: true
    }
  });
  let address = await nftfi.account.getAuthAddress()
  console.log(">>>", address, JSON.stringify(payload), JSON.stringify(offer))
};