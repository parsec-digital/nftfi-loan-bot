import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let secrets;

export default {
  init: async function (options) {
    if (!secrets) {
      const client = new SecretManagerServiceClient();
      const [version] = await client.accessSecretVersion({
        name: `projects/config-platform-363618/secrets/nftfi-loan-bot--${options.mode}/versions/latest`,
      });
      secrets = JSON.parse(version.payload.data.toString());
    }
    return secrets;
  }
}