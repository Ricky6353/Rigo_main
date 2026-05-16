const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('No MONGODB_URI found');
    return;
  }

  console.log('Testing MongoDB connection to:', uri.split('@')[1] || 'URL hidden');
  const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    const db = client.db(process.env.MONGODB_DB);
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (err) {
    console.error('MongoDB Connection Error:', err);
  } finally {
    await client.close();
  }
}

testMongo();
