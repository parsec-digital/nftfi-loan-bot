import axios from 'axios'
import rateLimit from 'axios-rate-limit';
import axiosRetry from 'axios-retry';
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const http = rateLimit(axios.create(), { maxRequests: 2, perMilliseconds: 4000, })
axiosRetry(http, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const persistProjectCollectionJsonPath = function (projectCollection, projectCollectionJsonPath) {
  let json = JSON.stringify(projectCollection)
  fs.writeFileSync(projectCollectionJsonPath, json);
}

const getCollection = async function(tokenAddress, tokenId) {
  let asset = {}
  if (tokenAddress && tokenId) {
    try {
      let config = {
        headers: {
          'X-API-Key': process.env.OPENSEA_API_KEY
        }
      }
      let uri = `https://api.opensea.io/api/v1/asset/${tokenAddress}/${tokenId}/?include_orders=false`
      let result = await http.get(uri, config);
      asset = result.data
    } catch(e) {
      console.error(e)
    }
  }
  let collection = asset?.collection || {}
  return collection
}

const cwd = process.cwd()
const projectCollectionJsonPath = cwd + '/db/prod/projects_collections.json'
const projectJsonPath = cwd + '/db/prod/projects.json'
const rawProjects = JSON.parse(fs.readFileSync(projectJsonPath));
const projects = rawProjects

let projectCollection = { 'data': [] }
projectCollection['data'] = await Promise.all(projects.map(async function(project) {
  const projectId = project.id
  const tokenAddess = project.contract.id
  const tokenId = project?.tokens[0]?.tokenId
  const collection = await getCollection(tokenAddess, tokenId)
  return {
    project: { id: projectId },
    collection: { slug: collection?.slug }
  }
}))

persistProjectCollectionJsonPath(projectCollection, projectCollectionJsonPath)