import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const bucket = new gcp.storage.Bucket("bucket", {location: "US"});
const archive = new gcp.storage.BucketObject("archive", {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/create-offer/dist.zip"),
});
const pending_create_offer_topic = new gcp.pubsub.Topic("pending-create-offer", {
  messageRetentionDuration: "86600s",
});
const create_offer_fn = new gcp.cloudfunctions.Function("create-offer", {
  region: "us-central1",
  description: "Creates NFTfi offers",
  runtime: "nodejs16",
  serviceAccountEmail: "pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 128,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: archive.name,
  eventTrigger: {
    eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
    resource: pending_create_offer_topic.id
  },
  timeout: 60,
  entryPoint: "handle"
});
const invoker = new gcp.cloudfunctions.FunctionIamMember("create-offer-invoker", {
  project: create_offer_fn.project,
  region: create_offer_fn.region,
  cloudFunction: create_offer_fn.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});