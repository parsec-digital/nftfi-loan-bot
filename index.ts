import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const bucket = new gcp.storage.Bucket("handler-bucket", {location: "US"});

// Dist files in bucket
const get_listings_archive = new gcp.storage.BucketObject("get-listings", {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/get-listings/dist.zip"),
});
const create_offer_terms_archive = new gcp.storage.BucketObject("create-offer-terms", {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/create-offer-terms/dist.zip"),
});

const create_offer_archive = new gcp.storage.BucketObject("create-offer", {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/create-offer/dist.zip"),
});

// PubSub topics
const new_listings_trigger_topic = new gcp.pubsub.Topic("new-listings-trigger", {
  messageRetentionDuration: "86600s",
});
const new_listings_topic = new gcp.pubsub.Topic("new-listings", {
  messageRetentionDuration: "86600s",
});
const pending_create_offer_topic = new gcp.pubsub.Topic("pending-create-offer", {
  messageRetentionDuration: "86600s",
});

// Cloud functions
const get_listings_fn = new gcp.cloudfunctions.Function("get-listings", {
  region: "us-central1",
  runtime: "nodejs16",
  serviceAccountEmail: "pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 256,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: get_listings_archive.name,
  eventTrigger: {
    eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
    resource: new_listings_trigger_topic.id
  },
  timeout: 60,
  entryPoint: "handle"
});
const create_offer_terms_fn = new gcp.cloudfunctions.Function("create-offer-terms", {
  region: "us-central1",
  runtime: "nodejs16",
  serviceAccountEmail: "pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 256,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: create_offer_terms_archive.name,
  eventTrigger: {
    eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
    resource: new_listings_topic.id
  },
  timeout: 60,
  entryPoint: "handle"
});
const create_offer_fn = new gcp.cloudfunctions.Function("create-offer", {
  region: "us-central1",
  runtime: "nodejs16",
  serviceAccountEmail: "pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 256,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: create_offer_archive.name,
  eventTrigger: {
    eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
    resource: pending_create_offer_topic.id
  },
  timeout: 60,
  entryPoint: "handle"
});

// Triggers
const get_new_allowed_listings_job = new gcp.cloudscheduler.Job("job", {
  pubsubTarget: {
    topicName: new_listings_trigger_topic.id,
    data: 'eyJoZWxsbyI6ICJ3b3JsZCJ9'
  },
  region: "us-central1",
  attemptDeadline: "60s",
  schedule: "*/2 * * * *",
});

// Permissions
const admin = gcp.organizations.getIAMPolicy({
  bindings: [{
      role: "roles/viewer",
      members: ["pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com"],
  }],
});
//// Cloud Functions
const get_listings_invoker = new gcp.cloudfunctions.FunctionIamMember("get-listings-invoker", {
  project: get_listings_fn.project,
  region: get_listings_fn.region,
  cloudFunction: get_listings_fn.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});
const create_offer_terms_invoker = new gcp.cloudfunctions.FunctionIamMember("create-offer-terms-invoker", {
  project: create_offer_terms_fn.project,
  region: create_offer_terms_fn.region,
  cloudFunction: create_offer_terms_fn.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});
const create_offer_invoker = new gcp.cloudfunctions.FunctionIamMember("create-offer-invoker", {
  project: create_offer_fn.project,
  region: create_offer_fn.region,
  cloudFunction: create_offer_fn.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});
//// Topics
const new_listings_topic_binding = new gcp.pubsub.TopicIAMBinding("new-listings-topic-binding", {
  project: new_listings_topic.project,
  topic: new_listings_topic.name,
  role: "roles/editor",
  members: ["serviceAccount:pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com"],
});
const pending_create_offer_topic_binding = new gcp.pubsub.TopicIAMBinding("pending-create-offer-topic-binding", {
  project: pending_create_offer_topic.project,
  topic: pending_create_offer_topic.name,
  role: "roles/editor",
  members: ["serviceAccount:pk-signer@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com"],
});