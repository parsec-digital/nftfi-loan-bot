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

const persistProjectsToMongo = async function (projects) {
  let mongo = await getMongo()
  let collection = mongo.collection("projects")
  const documents = projects.map(function(project) {
    return {
      id: project.id,
      contract: {
        address: project.contract.id
      },
      name: project.name,
      artistName: project.artistName,
      curationStatus: project.curationStatus,
      invocations: project.invocations,
      maxInvocations: project.maxInvocations,
      tokens: project.tokens
    }
  })
  const bulkDocs = documents.map(function(document) {
    return {
      insertOne: document
    }
  })
  const result = await collection.bulkWrite(bulkDocs, { ordered: false } )
  return result;
}

const persistProjectsCollectionsToMongo = async function (projects) {
  let mongo = await getMongo()
  let collection = mongo.collection("projects")
  const bulkDocs = projects['data'].map(function(document) {
    return {
      updateOne: {
        filter: { "id": document.project.id },
        update: { 
          $set: {
            collection: document.collection 
          } 
        }
      } 
    }
  })
  const result = await collection.bulkWrite(bulkDocs, { ordered: false } )
  return result;
}

const persistAllowlistToMongo = async function (allowlist) {
  let mongo = await getMongo()
  let collection = mongo.collection("projects")
  const bulkDocs = allowlist.map(function(document) {
    return {
      updateOne: {
        filter: { "id": document.project.id },
        update: { 
          $set: {
            rating: document.rating,
            allowed: document.allowed
          } 
        }
      } 
    }
  })
  const result = await collection.bulkWrite(bulkDocs, { ordered: false } )
  console.log(result)
  return result;
}

const parseAllowList = function(path) {
  let allowlist = [];
    let data = fs.readFileSync(path, "utf8");
    data = data.split("\r\n");
    for (let row of data) { 
      const triple = row.split(",");
      allowlist.push({
        project: { id: triple[0] },
        rating:{ stars: Number(triple[2]) },
        allowed: true
      });
    }
    return allowlist;
}

///////////////////////
const cwd = process.cwd()
// const projectsJsonPath = cwd + '/db/prod/projects.json'
// const projects = JSON.parse(fs.readFileSync(projectsJsonPath));
// const projectsRes = await persistProjectsToMongo(projects);
// console.log(`Inserted ${projectsRes.nInserted} projects`);
///////////////////////
// const projectsCollectionsJsonPath = cwd + '/db/prod/projects_collections.json'
// const projectsCollections = JSON.parse(fs.readFileSync(projectsCollectionsJsonPath));
// const projCollectionRes = await persistProjectsCollectionsToMongo(projectsCollections);
// console.log(`Updated ${projCollectionRes.nUpdated} projects`);
///////////////////////
// const allowlistPath = cwd + '/db/prod/project_allowlist_ratings.csv'
// const allowlist = parseAllowList(allowlistPath);
// const allowlistRes = await persistAllowlistToMongo(allowlist);
// console.log(`Updated ${allowlistRes.nUpdated} projects`);