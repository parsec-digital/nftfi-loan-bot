import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { MongoClient, ServerApiVersion } from "mongodb";
import fs from 'fs'

async function getMongo() {
  const mode = "prod"
  const secretClient = new SecretManagerServiceClient();
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/config-platform-363618/secrets/nftfi-loan-bot--${mode}/versions/latest`,
  });
  const secrets = JSON.parse(version.payload.data.toString());
  const uri = secrets.mongo.readwrite.uri;
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
  await client.connect();
  return client.db(secrets.mongo.readwrite.db)
}

const persistProjectCollectionStatsToMongo = async function (projectCollectionsStats) {
  let mongo = await getMongo()
  let collection = mongo.collection("projects_stats")
  let documents = projectCollectionsStats['data']
  documents = documents.filter(function(document) {
    return document?.stats?.floor_price && document.stats.floor_price !== null && document.stats.floor_price > 0;
  })
  documents = documents.map(function(document) {
    return {
      project: { id: document.project.id },
      stats: document.stats
    }
  })
  const bulkDocs = documents.map(function(document) {
    return {
      // insertOne: document
      updateOne: {
        filter: { "project.id": document.project.id },
        update: { 
          $set: {
            stats: document.stats 
          } 
        }
      } 
    }
  })
  const result = await collection.bulkWrite(bulkDocs, { ordered: false } )
  return result;
}

const cwd = process.cwd()
const projectCollectionsStatsJsonPath = cwd + '/db/prod/project_collection_stats.json'
const projectCollectionsStats = JSON.parse(fs.readFileSync(projectCollectionsStatsJsonPath));
const result = await persistProjectCollectionStatsToMongo(projectCollectionsStats);
console.log(`Updated ${result.nModified} project stats`);