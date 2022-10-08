import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

const mode = pulumi.getStack();

const bucket = new gcp.storage.Bucket(`handler-bucket-${mode}`, {location: "US"});

// Dist files in bucket
const get_listings_archive = new gcp.storage.BucketObject(`get-listings-${mode}`, {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/get-listings/dist.zip"),
});
const create_offer_terms_archive = new gcp.storage.BucketObject(`create-offer-terms-${mode}`, {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/create-offer-terms/dist.zip"),
});

const create_offer_archive = new gcp.storage.BucketObject(`create-offer-${mode}`, {
  bucket: bucket.name,
  source: new pulumi.asset.FileAsset("./src/handlers/create-offer/dist.zip"),
});

// PubSub topics
const new_listings_trigger_topic = new gcp.pubsub.Topic(`new-listings-trigger-${mode}`, {
  messageRetentionDuration: "86600s",
});
const new_listings_topic = new gcp.pubsub.Topic(`new-listings-${mode}`, {
  messageRetentionDuration: "86600s",
});
const pending_create_offer_topic = new gcp.pubsub.Topic(`pending-create-offer-${mode}`, {
  messageRetentionDuration: "86600s",
});

// Cloud functions
const get_listings_fn = new gcp.cloudfunctions.Function(`get-listings-${mode}`, {
  region: "us-central1",
  runtime: "nodejs16",
  serviceAccountEmail: "cloudfn@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 256,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: get_listings_archive.name,
  eventTrigger: {
    eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
    resource: new_listings_trigger_topic.id
  },
  environmentVariables: {
    MODE: mode,
    OUTPUT_TOPIC_ID: new_listings_topic.id
  },
  timeout: 60,
  entryPoint: "handle"
});
const create_offer_terms_fn = new gcp.cloudfunctions.Function(`create-offer-terms-${mode}`, {
  region: "us-central1",
  runtime: "nodejs16",
  serviceAccountEmail: "cloudfn@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 256,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: create_offer_terms_archive.name,
  eventTrigger: {
    eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
    resource: new_listings_topic.id
  },
  environmentVariables: {
    MODE: mode,
    OUTPUT_TOPIC_ID: pending_create_offer_topic.id
  },
  timeout: 60,
  entryPoint: "handle"
});
const create_offer_fn = new gcp.cloudfunctions.Function(`create-offer-${mode}`, {
  region: "us-central1",
  runtime: "nodejs16",
  serviceAccountEmail: "cloudfn@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com",
  availableMemoryMb: 256,
  sourceArchiveBucket: bucket.name,
  sourceArchiveObject: create_offer_archive.name,
  eventTrigger: {
    eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
    resource: pending_create_offer_topic.id
  },
  environmentVariables: {
    MODE: mode
  },
  timeout: 60,
  entryPoint: "handle"
});

// Triggers
const get_new_allowed_listings_job = new gcp.cloudscheduler.Job(`new-listings-job-${mode}`, {
  pubsubTarget: {
    topicName: new_listings_trigger_topic.id,
    data: 'eyJoZWxsbyI6ICJ3b3JsZCJ9'
  },
  region: "us-central1",
  attemptDeadline: "60s",
  schedule: "*/5 * * * *",
});

// Permissions
const admin = gcp.organizations.getIAMPolicy({
  bindings: [{
    role: "roles/viewer",
    members: ["cloudfn@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com"],
  }],
});
//// Cloud Functions
const get_listings_invoker = new gcp.cloudfunctions.FunctionIamMember(`get-listings-invoker-${mode}`, {
  project: get_listings_fn.project,
  region: get_listings_fn.region,
  cloudFunction: get_listings_fn.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});
const create_offer_terms_invoker = new gcp.cloudfunctions.FunctionIamMember(`create-offer-terms-invoker-${mode}`, {
  project: create_offer_terms_fn.project,
  region: create_offer_terms_fn.region,
  cloudFunction: create_offer_terms_fn.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});
const create_offer_invoker = new gcp.cloudfunctions.FunctionIamMember(`create-offer-invoker-${mode}`, {
  project: create_offer_fn.project,
  region: create_offer_fn.region,
  cloudFunction: create_offer_fn.name,
  role: "roles/cloudfunctions.invoker",
  member: "user:mike@parsec-digital.co",
});
//// Topics
const new_listings_topic_binding = new gcp.pubsub.TopicIAMBinding(`new-listings-topic-binding-${mode}`, {
  project: new_listings_topic.project,
  topic: new_listings_topic.name,
  role: "roles/editor",
  members: ["serviceAccount:cloudfn@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com"],
});
const pending_create_offer_topic_binding = new gcp.pubsub.TopicIAMBinding(`pending-create-offer-topic-binding-${mode}`, {
  project: pending_create_offer_topic.project,
  topic: pending_create_offer_topic.name,
  role: "roles/editor",
  members: ["serviceAccount:cloudfn@nft-art-loans-nftfi-loan-bot.iam.gserviceaccount.com"],
});