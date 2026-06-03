/**
 * Creates or updates the two admin accounts in Supabase (users table + users bucket).
 * Default password: admin@123
 *
 * Run: node create_admin_supabase.js
 */
const { createClient } = require('@supabase/supabase-js');
const { randomBytes, scryptSync } = require('crypto');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const ADMIN_EMAILS = ['embroyitltdjay@gmail.com', 'embroyitricky@gmail.com'];
const BUCKET_USERS = 'users';
const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'admin@123';

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function userStoragePath(userId) {
  return `records/${userId}.json`;
}

async function uploadUserJson(supabase, userId, payload) {
  const path = userStoragePath(userId);
  const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
  const { error } = await supabase.storage.from(BUCKET_USERS).upload(path, body, {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) {
    console.warn(`  Bucket upload warning (${path}):`, error.message);
    return false;
  }
  return true;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const adminAccounts = [
    { email: 'embroyitltdjay@gmail.com', name: 'Jay Embroyit Admin' },
    { email: 'embroyitricky@gmail.com', name: 'Ricky Admin' },
  ];

  // Verify users table exists
  const { error: tableCheckError } = await supabase.from('users').select('id').limit(1);
  if (tableCheckError?.message?.includes('schema cache') || tableCheckError?.code === 'PGRST205') {
    console.error('\nThe `users` table does not exist in Supabase yet.');
    console.error('1. Open Supabase Dashboard → SQL Editor');
    console.error('2. Paste and run: supabase/schema.sql');
    console.error('3. Run this script again: node create_admin_supabase.js\n');
    process.exit(1);
  }

  console.log('Ensuring admin accounts in Supabase...\n');

  for (const account of adminAccounts) {
    const email = account.email.toLowerCase();
    const hashed = hashPassword(DEFAULT_PASSWORD);
    const now = new Date().toISOString();

    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      console.error(`Failed to lookup ${email}:`, findError.message);
      continue;
    }

    let userId;

    if (existingUser) {
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({
          name: account.name,
          password: hashed,
          role: 'admin',
          updated_at: now,
        })
        .eq('email', email)
        .select('id')
        .single();

      if (updateError) {
        console.error(`Failed to update ${email}:`, updateError.message);
        continue;
      }
      userId = updated.id;
      console.log(`Updated admin: ${email} (id: ${userId})`);
    } else {
      const { data: created, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            name: account.name,
            email,
            password: hashed,
            role: 'admin',
            created_at: now,
            updated_at: now,
          },
        ])
        .select('id')
        .single();

      if (insertError) {
        console.error(`Failed to create ${email}:`, insertError.message);
        continue;
      }
      userId = created.id;
      console.log(`Created admin: ${email} (id: ${userId})`);
    }

    const bucketOk = await uploadUserJson(supabase, userId, {
      id: userId,
      name: account.name,
      email,
      role: 'admin',
      password: hashed,
      created_at: now,
      updated_at: now,
      is_admin_portal_account: true,
    });

    console.log(`  users bucket: ${bucketOk ? 'ok' : 'skipped/failed'}`);
  }

  console.log('\nDone. Sign in at /login with:');
  for (const e of ADMIN_EMAILS) {
    console.log(`  ${e}  /  password: ${DEFAULT_PASSWORD}`);
  }
  console.log('\nThen open /admin');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
