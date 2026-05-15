import { getMongoClient } from './mongodb';
import { ObjectId } from 'mongodb';

export interface MongoFileResult {
  fileId: string;
  viewLink: string;
}

export async function uploadToMongoDB(
  file: File,
  metadata: Record<string, any> = {}
): Promise<MongoFileResult> {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB;

  if (!client || !dbName) {
    throw new Error('MongoDB configuration missing');
  }

  const db = client.db(dbName);
  const collection = db.collection('customization_files');

  const buffer = Buffer.from(await file.arrayBuffer());

  const document = {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    data: buffer,
    ...metadata,
    uploadedAt: new Date(),
  };

  const result = await collection.insertOne(document);
  const fileId = result.insertedId.toString();
  
  // Link to a new API route we will create to serve the file
  const viewLink = `/api/customizations/view/${fileId}`;

  return { fileId, viewLink };
}

export async function getFileFromMongoDB(fileId: string) {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB;

  if (!client || !dbName) {
    return null;
  }

  const db = client.db(dbName);
  const collection = db.collection('customization_files');

  try {
    const file = await collection.findOne({ _id: new ObjectId(fileId) });
    return file;
  } catch (err) {
    console.error('Error fetching file from MongoDB:', err);
    return null;
  }
}
