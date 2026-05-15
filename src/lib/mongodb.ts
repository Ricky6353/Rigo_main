import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.warn('MONGODB_URI is not configured. Order DB persistence is disabled.');
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getMongoClient() {
  if (!uri) {
    return null;
  }

  if (client) {
    return client;
  }

  if (!clientPromise) {
    const mongoClient = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = mongoClient.connect();
  }

  client = await clientPromise;
  return client;
}
