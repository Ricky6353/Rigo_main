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
    
    const adminAccounts = [
      { email: 'embroyitltdjay@gmail.com', name: 'Jay Embroyit Admin' },
      { email: 'embroyitricky@gmail.com', name: 'Ricky Admin' }
    ];
    
    const password = 'admin@123';
    
    for (const account of adminAccounts) {
      const existing = await users.findOne({ email: account.email });
      
      if (existing) {
        await users.updateOne(
          { email: account.email }, 
          { $set: { password: hashPassword(password), role: 'admin' } }
        );
        console.log(`Updated admin user ${account.email} with new password.`);
      } else {
        await users.insertOne({
          name: account.name,
          email: account.email,
          password: hashPassword(password),
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created admin user ${account.email} with password "${password}".`);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

main();
