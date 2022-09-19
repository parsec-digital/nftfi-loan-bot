import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const bucket = new gcp.storage.Bucket("bucket", {location: "US"});
const archive = new gcp.storage.BucketObject("archive", {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/signer/dist.zip"),
});
const _function = new gcp.cloudfunctions.Function("offer-signer", {
  region: "us-central1",
  description: "Signs NFTfi offers",
  runtime: "nodejs16",
  serviceAccountEmail: "pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 128,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: archive.name,
  triggerHttp: true,
  httpsTriggerSecurityLevel: "SECURE_ALWAYS",
  timeout: 60,
  entryPoint: "handle"
});
const invoker = new gcp.cloudfunctions.FunctionIamMember("invoker", {
  project: _function.project,
  region: _function.region,
  cloudFunction: _function.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});