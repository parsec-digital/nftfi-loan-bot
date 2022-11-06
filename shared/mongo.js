import { MongoClient, ServerApiVersion } from "mongodb";

let mongo;

export default {
  init: async function(options) {
    if(!mongo) {
      const uri = options.secrets.mongo.readonly.uri;
      const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
      await client.connect();
      mongo = client.db(options.secrets.mongo.readonly.db)
    }
    return mongo;
  }
}