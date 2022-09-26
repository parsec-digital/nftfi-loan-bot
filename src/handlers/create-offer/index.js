import { GcpKmsSigner } from "ethers-gcp-kms-signer";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import ethers from "ethers";
import Bot from '@nftartloans/js';

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

// Handle event
export const handle = async function (event) {
  try {
    // Init Secrets
    await initSecrets()
    // Init Bot
    await initBot()
    // Prepare payload
    let payload;
    if (!event.data) {
      payload = {"nft":{"id":"1122372","address":"0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b","project":{"id":"0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b-1","artist":{"name":"Paradigm"},"name":"Paradigm","status":{},"contract":{"address":"0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b"},"ids":{"min":"0","max":"115792089237316195423570985008687907853269984665640564039457584007913129639934"},"floorPrice":"1000000000000000000"}},"lender":{"address":"0xf7F87d0236CC863D10870f7373D83Cceeb0D56A8","nonce":"35067216406474437508369776253876204116504083348825829443229523248300493780678"},"borrower":{"address":"0x5bd000ae659d81251426be803b18757fccdd9daf"},"referrer":{"address":"0x0000000000000000000000000000000000000000"},"terms":{"duration":2592000,"repayment":"1100000000000000","principal":"1000000000000000","currency":"0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6","expiry":1695563325,"interest":{"prorated":false,"bps":0},"ltv":0.4,"apr":35},"nftfi":{"contract":{"name":"v2.loan.fixed"},"fee":{"bps":"500"}},"signature":"0x44d5d4f11a58f56bccb2803fca8598ff3d69aea80db9d819eb829d280dcd30367775ceceef6cb0773525493bb931a7a2a1602611f7651c4085150ed5abecc4eb1f"}
    } else {
      payload = JSON.parse(Buffer.from(event.data, 'base64').toString())
    }
    console.log("-->", JSON.stringify(payload))
    // Create signed offer
    let offer = await bot.nftfi.offers.create({
      terms: payload.terms,
      nft: payload.nft,
      borrower: payload.borrower,
      nftfi: payload.nftfi
    });
    // Append multisig info
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
    // Info
    console.log("-->", JSON.stringify(offer))
    return true;
  } catch (e) {
    console.error(e)
    return false;
  }
};