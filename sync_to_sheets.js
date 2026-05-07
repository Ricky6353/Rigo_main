const { MongoClient } = require('mongodb');
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

const ORDERS_SHEET_NAME = 'DailyOrders';
const HEADER_ROW = [
  'orderId',
  'orderDate',
  'customerName',
  'contact',
  'phoneNumber',
  'email',
  'emailId',
  'address',
  'city',
  'postalCode',
  'items',
  'itemCount',
  'total',
  'paymentMethod',
  'transactionId',
];

async function syncOrders() {
  if (!MONGODB_URI || !MONGODB_DB || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SPREADSHEET_ID) {
    console.error('Missing configuration in .env.local');
    return;
  }

  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);
  const orders = await db.collection('orders').find({}).toArray();
  console.log(`Found ${orders.length} orders in database.`);

  console.log('Authenticating with Google...');
  const formattedKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email: GOOGLE_CLIENT_EMAIL,
    key: formattedKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Preparing spreadsheet...');
  // Ensure sheet exists and has header
  try {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: GOOGLE_SPREADSHEET_ID });
    const titleExists = metadata.data.sheets.some((sheet) => sheet.properties.title === ORDERS_SHEET_NAME);

    if (!titleExists) {
      console.log(`Creating sheet: ${ORDERS_SHEET_NAME}`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SPREADSHEET_ID,
        requestBody: {
          requests: [{ addSheet: { properties: { title: ORDERS_SHEET_NAME } } }],
        },
      });
    }

    // Set header
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${ORDERS_SHEET_NAME}!A1:O1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });

    console.log('Syncing orders...');
    const rows = orders.map((order) => {
      const items = Array.isArray(order.items) 
        ? order.items.map((item) => `${item.name}${item.size ? ` (${item.size})` : ''} x${item.quantity}`).join(' | ')
        : '';
      
      return [
        order.orderId || '',
        order.orderDate || '',
        order.customerName || '',
        order.contact || order.phoneNumber || '',
        order.phoneNumber || '',
        order.email || order.emailId || '',
        order.emailId || '',
        order.address || '',
        order.city || '',
        order.postalCode || '',
        items,
        order.itemCount || 0,
        order.total || 0,
        order.paymentMethod || '',
        order.transactionId || order.stripePaymentIntentId || order.stripeSessionId || '',
      ];
    });

    if (rows.length > 0) {
      // Clear existing content (except header) and rewrite all
      // Or just append? The user said "update all the columns", maybe they mean all current orders.
      // I'll clear and rewrite to ensure it's a full sync.
      await sheets.spreadsheets.values.clear({
        spreadsheetId: GOOGLE_SPREADSHEET_ID,
        range: `${ORDERS_SHEET_NAME}!A2:O10000`,
      });

      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SPREADSHEET_ID,
        range: `${ORDERS_SHEET_NAME}!A2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
      console.log('Successfully synced all orders to Google Sheets.');
    } else {
      console.log('No orders to sync.');
    }

  } catch (error) {
    console.error('Error syncing to Google Sheets:', error.message);
    if (error.response) {
      console.error('Details:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await client.close();
  }
}

syncOrders();
