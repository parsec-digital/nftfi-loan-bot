import Bot from '@nftartloans/js';
import { GcpKmsSigner } from 'ethers-gcp-kms-signer';
import ethers from 'ethers';

let bot = undefined;

export default {
  /**
   * Init the bot.
   *
   * @param {object} [options] - Hashmap of config options for this method
   * @param {string} [options.mode] - The mode `dev` | `prod` 
   * @param {string} [options.secrets] - Secret config
   * @param {string} [options.mongo] - Mongodb client
   * @returns {object} Bot
   */
  init: async function (options) {
    if (!bot) {
      // Init provider
      const provider = ethers.providers.getDefaultProvider(options.secrets.providerUrl);
      // Init signer
      let signer = new GcpKmsSigner(options.secrets.kmsCredentials);
      signer = signer.connect(provider);
      // Init Bot
      bot = await Bot.init({
        bot: { 
          config: { mode: options.mode },
          dependencies: {
            mongo: options.mongo
          } 
        },
        nftfi: {
          config: { api: { key: options.secrets.apiKey } },
          ethereum: { 
            provider: { url: options.secrets.providerUrl },
            account: { multisig: { gnosis: { safe: { 
              address: options.secrets.gnosisSafeAddress,
              owners: { signers: [signer] } 
            }}}}
          }
        }
      });
    }
    return bot;
  }
}