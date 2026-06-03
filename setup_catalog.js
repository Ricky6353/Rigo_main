/**
 * Full catalog setup: SQL tables + data migration.
 * Requires SUPABASE_DB_PASSWORD in .env.local
 */
require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');

if (!process.env.SUPABASE_DB_PASSWORD) {
  console.error('\nAdd SUPABASE_DB_PASSWORD to .env.local first.');
  console.error('Supabase Dashboard → Project Settings → Database → Database password\n');
  process.exit(1);
}

console.log('Step 1: Apply catalog SQL schema...');
execSync('node run_catalog_schema.js', { stdio: 'inherit' });

console.log('\nStep 2: Migrate catalog data to Supabase DB...');
execSync('node migrate_catalog_to_supabase.js', { stdio: 'inherit' });

console.log('\nCatalog setup complete.');
