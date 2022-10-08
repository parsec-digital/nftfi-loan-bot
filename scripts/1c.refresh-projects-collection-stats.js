import axios from 'axios'
import rateLimit from 'axios-rate-limit';
import axiosRetry from 'axios-retry';
import fs from 'fs'

const http = rateLimit(axios.create(), { maxRPS: 3 })
axiosRetry(http, { retries: 3 });

const persistProjectCollectionStats = function (projectCollectionsStats, path) {
  let json = JSON.stringify(projectCollectionsStats)
  fs.writeFileSync(path, json);
}

const getStats = async function(collectionSlug) {
  let stats = {}
  if (collectionSlug) {
    try {
      let uri = `https://api.opensea.io/api/v1/collection/${collectionSlug}/stats`
      let result = await http.get(uri);
      stats = result.data.stats
    } catch(e) {
      console.error(e)
    }
  }
  return stats
}

const cwd = process.cwd()
const projectCollectionsStatsJsonPath = cwd + '/db/prod/project_collection_stats.json'
const projectCollectionsJsonPath = cwd + '/db/prod/projects_collections.json'
const rawProjects = JSON.parse(fs.readFileSync(projectCollectionsJsonPath));
const projectsCollections = rawProjects.data

let projectCollectionsStats = { data: [] }
projectCollectionsStats['data'] = await Promise.all(projectsCollections.map(async function(row) {
  row['stats'] = await getStats(row.collection.slug)
  return row
}))

persistProjectCollectionStats(projectCollectionsStats, projectCollectionsStatsJsonPath)