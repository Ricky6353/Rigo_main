const { MongoClient } = require('mongodb');
const { randomBytes, scryptSync } = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found');
    return;
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const users = db.collection('users');
    
    const email = 'jayembroyit@gmail.com';
    const existing = await users.findOne({ email });
    
    if (existing) {
      if (!existing.password) {
         await users.updateOne({ email }, { $set: { password: hashPassword('admin123') } });
         console.log('User existed without password. Added password "admin123".');
      } else {
         await users.updateOne({ email }, { $set: { password: hashPassword('admin123') } });
         console.log('User already existed. Reset password to "admin123".');
      }
    } else {
      await users.insertOne({
        name: 'Jay Embroyit Admin',
        email,
        password: hashPassword('admin123'),
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Created admin user jayembroyit@gmail.com with password "admin123".');
    }
  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

main();
