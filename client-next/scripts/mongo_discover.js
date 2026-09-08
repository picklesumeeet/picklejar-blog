// One-shot discovery for the Mongo→Supabase migration.
// Counts docs per collection and prints a sample from each so we can eyeball
// the shape before writing the real migration script.
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI env var is required');
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db();
  console.log(`\nConnected to database: ${db.databaseName}\n`);

  const collections = await db.listCollections().toArray();
  const sortedNames = collections.map(c => c.name).sort();

  console.log('Collections:');
  for (const name of sortedNames) {
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    console.log(`  ${name.padEnd(24)} ${String(count).padStart(6)} docs`);
  }

  console.log('\nSample document from each collection:\n');
  for (const name of sortedNames) {
    const coll = db.collection(name);
    const sample = await coll.findOne({});
    console.log(`--- ${name} ---`);
    console.log(JSON.stringify(sample, null, 2));
    console.log();
  }
} finally {
  await client.close();
}
