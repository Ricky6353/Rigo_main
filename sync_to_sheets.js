/**
 * Bulk re-sync: reads all records from Supabase, then pushes to Google Sheets.
 * Run: node sync_to_sheets.js
 */
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_ORDERS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;

const ORDERS_SHEET = 'DailyOrders';
const USERS_SHEET = 'Users';
const CUSTOMIZATIONS_SHEET = 'Customizations';

function getAuth() {
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SPREADSHEET_ID) return null;
  return new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function clearAndWrite(sheets, spreadsheetId, tab, header, rows) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${tab}!A2:Z10000`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...rows] },
  });
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
  }

  const auth = getAuth();
  if (!auth) {
    console.error('Missing Google Sheets env vars');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Fetching from Supabase...');
  const [{ data: orders }, { data: users }, { data: files }] = await Promise.all([
    supabase.from('orders').select('*'),
    supabase.from('users').select('*'),
    supabase.from('customization_files').select('*'),
  ]);

  const orderRows = (orders || []).map((o) => {
    const items = Array.isArray(o.items)
      ? o.items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(' | ')
      : '';
    return [
      o.order_id,
      o.order_date,
      o.customer_name,
      o.contact,
      `'${o.phone_number || o.contact || ''}`,
      o.email,
      o.email,
      o.address,
      o.city,
      o.postal_code,
      items,
      o.item_count,
      o.total,
      o.payment_method,
      o.transaction_id,
      o.customization_link || '',
      o.customization_instructions || '',
      `records/${o.order_id}.json`,
    ];
  });

  const userRows = (users || []).map((u) => [
    String(u.id),
    u.name,
    u.email,
    u.role,
    u.created_at,
    `records/${u.id}.json`,
  ]);

  const fileRows = (files || []).map((f) => {
    const meta = f.metadata || {};
    return [
      meta.customer_name || meta.name || '',
      meta.email || '',
      `'${meta.phone || ''}`,
      f.file_name,
      meta.uploaded_at || '',
      meta.view_link || '',
      meta.instructions || '',
      f.path,
    ];
  });

  console.log(`Syncing ${orderRows.length} orders, ${userRows.length} users, ${fileRows.length} customizations...`);

  await clearAndWrite(sheets, GOOGLE_SPREADSHEET_ID, ORDERS_SHEET, [
    'orderId', 'orderDate', 'customerName', 'contact', 'phoneNumber', 'email', 'emailId',
    'address', 'city', 'postalCode', 'items', 'itemCount', 'total', 'paymentMethod',
    'transactionId', 'customizationLink', 'customizationInstructions', 'supabaseStoragePath',
  ], orderRows);

  await clearAndWrite(sheets, GOOGLE_SPREADSHEET_ID, USERS_SHEET, [
    'Supabase ID', 'Name', 'Email', 'Role', 'Created At', 'Storage Path',
  ], userRows);

  await clearAndWrite(sheets, GOOGLE_SPREADSHEET_ID, CUSTOMIZATIONS_SHEET, [
    'Name', 'Email', 'Phone', 'File Name', 'Date', 'Link', 'Instructions', 'Supabase Path',
  ], fileRows);

  console.log('Done — all data synced from Supabase to Google Sheets.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
