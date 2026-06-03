/**
 * Integration test: Supabase + Google Sheets for customization uploads.
 * Run: node scratch/test_supabase_sheets.js
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const TEST_MARKER = `integration-test-${Date.now()}`;

function envStatus(name) {
  const val = process.env[name];
  return { name, set: Boolean(val && String(val).trim()), length: val ? String(val).trim().length : 0 };
}

function getGoogleAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'https://developers.google.com/oauthplayground');
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
  }
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!clientEmail || !privateKey) return null;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function testSupabaseConnection() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return { ok: false, reason: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' };
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const checks = {};

  const { data: tables, error: tableErr } = await admin.from('customization_files').select('id').limit(1);
  checks.customization_files_table = tableErr ? { ok: false, error: tableErr.message } : { ok: true };

  const { data: buckets, error: bucketErr } = await admin.storage.listBuckets();
  const bucketNames = (buckets || []).map((b) => b.name);
  checks.storage_buckets = bucketErr
    ? { ok: false, error: bucketErr.message }
    : {
        ok: bucketNames.includes('customizations'),
        found: bucketNames,
        customizations_public: (buckets || []).find((b) => b.name === 'customizations')?.public ?? null,
      };

  if (anonKey) {
    const anon = createClient(url, anonKey);
    const { error: anonUploadErr } = await anon.storage.from('customizations').list('uploads', { limit: 1 });
    checks.anon_storage_list = anonUploadErr
      ? { ok: false, error: anonUploadErr.message }
      : { ok: true };
  }

  const allOk = Object.values(checks).every((c) => c.ok !== false);
  return { ok: allOk, checks };
}

async function testUploadApi() {
  const pdfPath = path.join(process.cwd(), 'public', 'references', 'reference.pdf');
  if (!fs.existsSync(pdfPath)) {
    return { ok: false, reason: `Test PDF not found at ${pdfPath}` };
  }

  const form = new FormData();
  const blob = new Blob([fs.readFileSync(pdfPath)], { type: 'application/pdf' });
  form.append('file', blob, 'test-upload.pdf');
  form.append('name', `Test User ${TEST_MARKER}`);
  form.append('email', `test+${TEST_MARKER}@example.com`);
  form.append('phone', '+44 7400123456');

  const res = await fetch('http://localhost:3000/api/upload', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));

  return {
    ok: res.ok,
    status: res.status,
    body,
    marker: TEST_MARKER,
  };
}

async function verifySupabaseRecord(marker) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin
    .from('customization_files')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) return { ok: false, error: error.message };

  const match = (data || []).find((row) => {
    const meta = row.metadata || {};
    return meta.customerName?.includes(marker) || meta.email?.includes(marker);
  });

  if (!match) {
    return { ok: false, reason: 'No matching customization_files row found for test upload', recent: data?.length || 0 };
  }

  const storagePath = match.path;
  const { data: fileData, error: dlErr } = await admin.storage.from('customizations').download(storagePath);

  return {
    ok: !dlErr && !!fileData,
    row: {
      id: match.id,
      file_name: match.file_name,
      path: match.path,
      metadata: match.metadata,
    },
    storage_download: dlErr ? { ok: false, error: dlErr.message } : { ok: true, size: fileData?.size },
  };
}

async function verifyGoogleSheets(marker) {
  const spreadsheetId = process.env.GOOGLE_ORDERS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  const auth = getGoogleAuth();

  if (!spreadsheetId) return { ok: false, reason: 'Missing GOOGLE_ORDERS_SPREADSHEET_ID / GOOGLE_SPREADSHEET_ID' };
  if (!auth) return { ok: false, reason: 'Google auth not configured (OAuth or service account)' };

  const sheets = google.sheets({ version: 'v4', auth });
  const range = 'Customizations!A:H';

  let values;
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    values = res.data.values || [];
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  }

  const header = values[0] || [];
  const rows = values.slice(1);
  const match = rows.find((row) => (row[0] || '').includes(marker) || (row[1] || '').includes(marker));

  return {
    ok: Boolean(match),
    header,
    total_rows: rows.length,
    matched_row: match || null,
    last_row: rows[rows.length - 1] || null,
  };
}

(async () => {
  console.log('=== Env check ===');
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_ORDERS_SPREADSHEET_ID',
    'GOOGLE_SPREADSHEET_ID',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REFRESH_TOKEN',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY',
  ];
  for (const e of envVars) {
    const s = envStatus(e);
    console.log(`  ${s.name}: ${s.set ? `set (${s.length} chars)` : 'MISSING'}`);
  }

  console.log('\n=== Supabase connection ===');
  const conn = await testSupabaseConnection();
  console.log(JSON.stringify(conn, null, 2));

  console.log('\n=== Upload API test ===');
  const upload = await testUploadApi();
  console.log(JSON.stringify(upload, null, 2));

  if (!upload.ok) {
    console.log('\n=== RESULT: FAILED (upload API) ===');
    process.exit(1);
  }

  console.log('\n=== Verify Supabase record ===');
  await new Promise((r) => setTimeout(r, 1500));
  const dbCheck = await verifySupabaseRecord(TEST_MARKER);
  console.log(JSON.stringify(dbCheck, null, 2));

  console.log('\n=== Verify Google Sheets ===');
  await new Promise((r) => setTimeout(r, 2000));
  const sheetCheck = await verifyGoogleSheets(TEST_MARKER);
  console.log(JSON.stringify(sheetCheck, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`Supabase connection: ${conn.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Upload API: ${upload.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Supabase DB + storage: ${dbCheck.ok ? 'PASS' : 'FAIL'}`);
  console.log(`Google Sheets sync: ${sheetCheck.ok ? 'PASS' : 'FAIL'}`);

  process.exit(conn.ok && upload.ok && dbCheck.ok && sheetCheck.ok ? 0 : 1);
})().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
