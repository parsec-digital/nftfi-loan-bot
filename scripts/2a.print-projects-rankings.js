import fs from 'fs'

const cwd = process.cwd()
const statsJsonPath = cwd + '/db/project_collection_stats.json'
const stats = JSON.parse(fs.readFileSync(statsJsonPath));
const rows = stats.data.map(function(row){
  return `${row.project.id}, ${row.collection.slug}, ${row?.stats?.total_volume}, ${row?.stats?.floor_price}, ${row?.stats?.average_price}`
})

for (const row of rows) {
  console.log(row)
}