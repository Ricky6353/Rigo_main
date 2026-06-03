const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Polyfill global.WebSocket to bypass Supabase Realtime client checks in Node < 22
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = class {
    constructor() {
      throw new Error("Mock WebSocket should not be instantiated");
    }
  };
}

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const mongoDbName = process.env.MONGODB_DB;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!mongoUri || !mongoDbName) {
    console.error('❌ MongoDB environment variables missing in .env.local');
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Supabase environment variables missing in .env.local');
    process.exit(1);
  }

  console.log('🔄 Connecting to databases...');
  const mongoClient = new MongoClient(mongoUri, { tls: true });
  await mongoClient.connect();
  const mongoDb = mongoClient.db(mongoDbName);
  console.log('✅ Connected to MongoDB.');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Connected to Supabase Service client.');

  try {
    // 1. Ensure Supabase Storage Bucket exists
    console.log('\n📦 Checking Supabase Storage Bucket...');
    const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
    if (listBucketsError) {
      throw new Error(`Failed to list buckets: ${listBucketsError.message}`);
    }

    const bucketName = 'customizations';
    const hasBucket = buckets.some((b) => b.name === bucketName);
    if (!hasBucket) {
      console.log(`Creating bucket "${bucketName}"...`);
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      });
      if (createBucketError) {
        throw new Error(`Failed to create bucket: ${createBucketError.message}`);
      }
      console.log(`✅ Bucket "${bucketName}" created.`);
    } else {
      console.log(`✅ Bucket "${bucketName}" already exists.`);
    }

    // 2. Migrate Users
    console.log('\n👥 Migrating Users...');
    const usersCol = mongoDb.collection('users');
    const mongoUsers = await usersCol.find({}).toArray();
    console.log(`Found ${mongoUsers.length} users in MongoDB.`);

    let usersMigrated = 0;
    for (const u of mongoUsers) {
      // Check if user already exists in Supabase
      const { data: existingUser, error: findUserError } = await supabase
        .from('users')
        .select('id')
        .eq('email', u.email)
        .maybeSingle();

      if (findUserError) {
        console.error(`⚠️ Error checking user ${u.email}:`, findUserError.message);
        continue;
      }

      if (existingUser) {
        console.log(`- User ${u.email} already exists in Supabase. Skipping.`);
        continue;
      }

      // Insert into Supabase
      const { error: insertUserError } = await supabase.from('users').insert([
        {
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role || 'user',
          created_at: u.createdAt || new Date(),
          updated_at: u.updatedAt || new Date(),
        },
      ]);

      if (insertUserError) {
        console.error(`❌ Failed to insert user ${u.email}:`, insertUserError.message);
      } else {
        console.log(`✅ Migrated user: ${u.email}`);
        usersMigrated++;
      }
    }
    console.log(`🎉 Migrated ${usersMigrated} new users to Supabase.`);

    // 3. Migrate Orders
    console.log('\n🛒 Migrating Orders...');
    const ordersCol = mongoDb.collection('orders');
    const mongoOrders = await ordersCol.find({}).toArray();
    console.log(`Found ${mongoOrders.length} orders in MongoDB.`);

    let ordersMigrated = 0;
    for (const o of mongoOrders) {
      // Check if order already exists in Supabase
      const { data: existingOrder, error: findOrderError } = await supabase
        .from('orders')
        .select('id')
        .eq('order_id', o.orderId)
        .maybeSingle();

      if (findOrderError) {
        console.error(`⚠️ Error checking order ${o.orderId}:`, findOrderError.message);
        continue;
      }

      if (existingOrder) {
        console.log(`- Order ${o.orderId} already exists in Supabase. Skipping.`);
        continue;
      }

      // Insert into Supabase
      const { error: insertOrderError } = await supabase.from('orders').insert([
        {
          order_id: o.orderId,
          order_date: o.orderDate || new Date(),
          customer_name: o.customerName,
          contact: o.contact || '',
          phone_number: o.phoneNumber,
          email: o.email,
          address: o.address,
          city: o.city,
          postal_code: o.postalCode,
          items: o.items || [],
          item_count: o.itemCount || 0,
          total: o.total || 0,
          payment_method: o.paymentMethod || 'unknown',
          transaction_id: o.transactionId,
          stripe_session_id: o.stripeSessionId,
          stripe_payment_intent_id: o.stripePaymentIntentId,
          status: o.status || 'paid',
          source: o.source || 'web',
          customization_link: o.customizationLink,
          customization_instructions: o.customizationInstructions,
        },
      ]);

      if (insertOrderError) {
        console.error(`❌ Failed to insert order ${o.orderId}:`, insertOrderError.message);
      } else {
        console.log(`✅ Migrated order: ${o.orderId}`);
        ordersMigrated++;
      }
    }
    console.log(`🎉 Migrated ${ordersMigrated} new orders to Supabase.`);

    // 4. Migrate Customization Files
    console.log('\n📁 Migrating Customization Files...');
    const filesCol = mongoDb.collection('customization_files');
    const mongoFiles = await filesCol.find({}).toArray();
    console.log(`Found ${mongoFiles.length} customization files in MongoDB.`);

    let filesMigrated = 0;
    for (const f of mongoFiles) {
      const fileId = f._id.toString();
      const filePath = `uploads/${fileId}-${f.fileName}`;

      // Check if metadata already exists in table
      const { data: existingMeta, error: findMetaError } = await supabase
        .from('customization_files')
        .select('id')
        .eq('file_id', filePath)
        .maybeSingle();

      if (findMetaError) {
        console.error(`⚠️ Error checking file metadata ${f.fileName}:`, findMetaError.message);
        continue;
      }

      if (existingMeta) {
        console.log(`- File metadata ${f.fileName} already exists in Supabase. Skipping.`);
        continue;
      }

      // Upload binary to Storage Bucket
      console.log(`Uploading file ${f.fileName} to Supabase Storage...`);
      // MongoDB stores buffer in binary format. In the node driver, it is a Binary object, where .buffer contains the Node Buffer.
      const buffer = f.data && f.data.buffer ? f.data.buffer : f.data;
      if (!buffer) {
        console.error(`❌ File ${f.fileName} has no binary data in MongoDB.`);
        continue;
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: f.mimeType || 'application/octet-stream',
          upsert: true,
        });

      if (uploadError) {
        console.error(`❌ Failed to upload binary for file ${f.fileName}:`, uploadError.message);
        continue;
      }

      // Save metadata into DB table
      const { error: insertMetaError } = await supabase.from('customization_files').insert([
        {
          file_id: filePath,
          file_name: f.fileName,
          mime_type: f.mimeType,
          size: f.size || buffer.length,
          path: filePath,
          metadata: {
            migratedFromMongoId: fileId,
            originalUploadedAt: f.uploadedAt,
          },
        },
      ]);

      if (insertMetaError) {
        console.error(`❌ Failed to insert metadata for file ${f.fileName}:`, insertMetaError.message);
      } else {
        console.log(`✅ Migrated file & metadata: ${f.fileName}`);
        filesMigrated++;
      }
    }
    console.log(`🎉 Migrated ${filesMigrated} new customization files to Supabase.`);

  } catch (error) {
    console.error('❌ Migration failed with error:', error);
  } finally {
    await mongoClient.close();
    console.log('\n🔒 MongoDB connection closed.');
    console.log('🏁 Migration process finished.');
  }
}

main();
