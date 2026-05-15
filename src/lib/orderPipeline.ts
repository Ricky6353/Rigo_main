import { google, sheets_v4 } from 'googleapis';
import { getMongoClient } from '@/lib/mongodb';
import { getGoogleAuth } from './googleAuth';

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
  'customizationLink',
  'customizationInstructions',
];

interface SyncResult {
  syncedToSheets: boolean;
  reason: string;
}

export interface OrderItemInput {
  id?: string;
  name: string;
  quantity: number;
  price?: number;
  size?: string;
}

export interface OrderInput {
  orderId: string;
  orderDate: string;
  customerName: string;
  contact: string;
  phoneNumber?: string;
  email: string;
  emailId?: string;
  address: string;
  city: string;
  postalCode: string;
  items: OrderItemInput[];
  itemCount: number;
  total: number;
  paymentMethod: string;
  transactionId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string | null;
  status?: string;
  source?: string;
  customizationLink?: string;
  customizationInstructions?: string;
}

function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_ORDERS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);

  if (!auth || !spreadsheetId) {
    return null;
  }

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

async function ensureSheetAndHeader(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const titleExists = metadata.data.sheets?.some((sheet) => sheet.properties?.title === ORDERS_SHEET_NAME);

  if (!titleExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: ORDERS_SHEET_NAME } } }],
      },
    });
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${ORDERS_SHEET_NAME}!A1:Q1`,
  });
  const currentHeader = headerResponse.data.values?.[0] || [];
  if (!currentHeader.length || currentHeader.length < HEADER_ROW.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${ORDERS_SHEET_NAME}!A1:Q1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

function formatOrderRow(order: OrderInput) {
  const items = order.items.map((item) => `${item.name}${item.size ? ` (${item.size})` : ''} x${item.quantity}`).join(' | ');
  return [
    order.orderId,
    order.orderDate,
    order.customerName,
    order.contact,
    `'${order.phoneNumber}`,
    order.email,
    order.emailId,
    order.address,
    order.city,
    order.postalCode,
    items,
    order.itemCount,
    order.total,
    order.paymentMethod,
    order.transactionId,
    order.customizationLink,
    order.customizationInstructions,
  ];
}

function normalizeOrder(order: Partial<OrderInput>): OrderInput {
  const items = Array.isArray(order.items) ? order.items : [];
  const contact = order.contact || order.phoneNumber || '';
  const email = order.email || order.emailId || '';
  const transactionId = order.transactionId || order.stripePaymentIntentId || order.stripeSessionId || '';

  return {
    orderId: order.orderId || `ORD-${Date.now()}`,
    orderDate: order.orderDate || new Date().toISOString(),
    customerName: order.customerName || '',
    contact,
    phoneNumber: contact,
    email,
    emailId: email,
    address: order.address || '',
    city: order.city || '',
    postalCode: order.postalCode || '',
    items,
    itemCount: order.itemCount ?? items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    total: Number(order.total ?? 0),
    paymentMethod: order.paymentMethod || 'unknown',
    transactionId,
    stripeSessionId: order.stripeSessionId,
    stripePaymentIntentId: order.stripePaymentIntentId ?? null,
    status: order.status || 'paid',
    source: order.source || 'web',
    customizationLink: order.customizationLink || '',
    customizationInstructions: order.customizationInstructions || '',
  };
}

async function saveOrderToDatabase(order: OrderInput) {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB;

  if (!client || !dbName) {
    return { persistedToDb: false, reason: 'MongoDB not configured' };
  }

  const collection = client.db(dbName).collection('orders');
  
  // Define filter to find existing order
  const filter = order.stripeSessionId 
    ? { stripeSessionId: order.stripeSessionId } 
    : { orderId: order.orderId };

  // Use updateOne with upsert to prevent race conditions
  const result = await collection.updateOne(
    filter,
    { 
      $setOnInsert: { 
        ...order,
        createdAt: new Date(),
      },
      $set: {
        updatedAt: new Date(),
      }
    },
    { upsert: true }
  );

  const duplicate = result.matchedCount > 0;
  return { 
    persistedToDb: true, 
    duplicate, 
    insertedId: result.upsertedId || (duplicate ? (await collection.findOne(filter))?._id : null) 
  };
}

async function appendOrderToGoogleSheets(order: OrderInput): Promise<SyncResult> {
  const auth = getSheetsClient();
  if (!auth) {
    return { syncedToSheets: false, reason: 'Google Sheets not configured' };
  }

  const { sheets, spreadsheetId } = auth;
  await ensureSheetAndHeader(sheets, spreadsheetId);
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${ORDERS_SHEET_NAME}!A:Q`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [formatOrderRow(order)] },
    });
    console.log(`Successfully synced order ${order.orderId} to Google Sheets.`);
    return { syncedToSheets: true, reason: 'Success' };
  } catch (err: any) {
    console.error(`Failed to sync order ${order.orderId} to Google Sheets:`, err.message);
    return { syncedToSheets: false, reason: err.message };
  }
}

export async function persistAndSyncOrder(payload: Partial<OrderInput>) {
  const order = normalizeOrder(payload);
  console.log(`Processing order ${order.orderId} from ${order.source}...`);

  // Try DB first
  let dbResult: any = { persistedToDb: false, reason: 'Pending' };
  try {
    dbResult = await saveOrderToDatabase(order);
    console.log(`DB persistence for ${order.orderId}: ${dbResult.persistedToDb ? 'SUCCESS' : 'FAILED'} (${dbResult.reason || 'No reason'})`);
  } catch (dbErr: any) {
    console.error(`Critical DB Error for ${order.orderId}:`, dbErr.message);
    dbResult = { persistedToDb: false, reason: dbErr.message };
  }
  
  // Try Sheets regardless of DB failure (unless it's a known duplicate)
  let sheetResult: SyncResult = { syncedToSheets: false, reason: 'Pending' };
  if (!dbResult.duplicate) {
    try {
      sheetResult = (await appendOrderToGoogleSheets(order)) as SyncResult;
      console.log(`Sheet sync for ${order.orderId}: ${sheetResult.syncedToSheets ? 'SUCCESS' : 'FAILED'}`);
    } catch (sheetErr: any) {
      console.error(`Critical Sheet Error for ${order.orderId}:`, sheetErr.message);
      sheetResult = { syncedToSheets: false, reason: sheetErr.message };
    }
  } else {
    console.log(`Skipping Sheet sync for ${order.orderId} (Duplicate detected)`);
  }
  
  return { order, dbResult, sheetResult };
}
