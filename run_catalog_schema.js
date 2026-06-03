/**
 * Creates catalog DB tables in Supabase by running catalog_migration.sql.
 * Run: node run_catalog_schema.js
 *
 * Set SUPABASE_DB_PASSWORD in .env.local (Supabase Dashboard → Project Settings → Database).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const SQL_PATH = path.join(process.cwd(), 'supabase', 'catalog_migration.sql');

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

function buildConnectionStrings(ref, password) {
  const enc = encodeURIComponent(password);
  return [
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${ref}:${enc}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  ];
}

async function tryConnect(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  return client;
}

async function main() {
  const ref = getProjectRef();
  const password = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_URL;

  if (!ref) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  if (!password) {
    console.error('\nCannot run SQL automatically: database password not in .env.local');
    console.error('Add this to .env.local (from Supabase → Project Settings → Database → Database password):');
    console.error('  SUPABASE_DB_PASSWORD=your_database_password\n');
    console.error('Then run: node run_catalog_schema.js\n');
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const connectionStrings = password.startsWith('postgresql://')
    ? [password]
    : buildConnectionStrings(ref, password);

  let client = null;
  let lastError = null;

  for (const cs of connectionStrings) {
    try {
      client = await tryConnect(cs);
      console.log('Connected to Supabase Postgres.');
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!client) {
    console.error('Failed to connect to Supabase Postgres:', lastError?.message || lastError);
    process.exit(1);
  }

  try {
    await client.query(sql);
    console.log('Catalog schema applied successfully (tables + RLS + buckets).');
  } catch (err) {
    console.error('SQL error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  const { error } = await require('@supabase/supabase-js').createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
    .from('products')
    .select('id')
    .limit(1);

  if (error) {
    console.warn('Table check:', error.message);
  } else {
    console.log('Verified: products table is available via API.');
  }
}

main();
