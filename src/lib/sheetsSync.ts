import { google, sheets_v4 } from 'googleapis';
import { getGoogleAuth } from './googleAuth';

const USERS_SHEET_NAME = 'Users';
const ORDERS_SHEET_NAME = 'DailyOrders';
const CUSTOMIZATIONS_SHEET_NAME = 'Customizations';

const USERS_HEADER = ['Supabase ID', 'Name', 'Email', 'Role', 'Created At', 'Storage Path'];
const ORDERS_HEADER = [
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
  'supabaseStoragePath',
];
const CUSTOMIZATIONS_HEADER = [
  'Request ID',
  'Name',
  'Email',
  'Phone',
  'Category ID',
  'Category Name',
  'Design Side',
  'Placement',
  'File Name',
  'Date',
  'Link',
  'Instructions',
  'Supabase Path',
];

function getSpreadsheetId() {
  return process.env.GOOGLE_ORDERS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID || '';
}

function getSheetsClient() {
  const spreadsheetId = getSpreadsheetId();
  const auth = getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
  if (!auth || !spreadsheetId) return null;
  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
}

async function ensureSheet(sheets: sheets_v4.Sheets, spreadsheetId: string, title: string, header: string[]) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = metadata.data.sheets?.some((sheet) => sheet.properties?.title === title);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title } } }] },
    });
  }

  const endCol = header.length <= 26 ? String.fromCharCode(64 + header.length) : 'Z';
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${title}!A1:${endCol}1`,
  });
  const currentHeader = headerResponse.data.values?.[0] || [];
  if (currentHeader.length < header.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1:${endCol}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [header] },
    });
  }
}

export interface SheetsSyncResult {
  syncedToSheets: boolean;
  reason: string;
}

export async function syncUserRecordToSheets(record: {
  id: string | number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  storage_path?: string;
}): Promise<SheetsSyncResult> {
  const client = getSheetsClient();
  if (!client) return { syncedToSheets: false, reason: 'Google Sheets not configured' };

  const { sheets, spreadsheetId } = client;
  await ensureSheet(sheets, spreadsheetId, USERS_SHEET_NAME, USERS_HEADER);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${USERS_SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          String(record.id),
          record.name,
          record.email,
          record.role,
          record.created_at || new Date().toISOString(),
          record.storage_path || '',
        ]],
      },
    });
    return { syncedToSheets: true, reason: 'Success' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { syncedToSheets: false, reason: message };
  }
}

export async function syncOrderRecordToSheets(order: {
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
  items: Array<{ name: string; quantity: number; size?: string }>;
  itemCount: number;
  total: number;
  paymentMethod: string;
  transactionId?: string;
  customizationLink?: string;
  customizationInstructions?: string;
  storage_path?: string;
}): Promise<SheetsSyncResult> {
  const client = getSheetsClient();
  if (!client) return { syncedToSheets: false, reason: 'Google Sheets not configured' };

  const { sheets, spreadsheetId } = client;
  await ensureSheet(sheets, spreadsheetId, ORDERS_SHEET_NAME, ORDERS_HEADER);

  const items = order.items
    .map((item) => `${item.name}${item.size ? ` (${item.size})` : ''} x${item.quantity}`)
    .join(' | ');

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${ORDERS_SHEET_NAME}!A:R`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          order.orderId,
          order.orderDate,
          order.customerName,
          order.contact,
          `'${order.phoneNumber || order.contact}`,
          order.email,
          order.emailId || order.email,
          order.address,
          order.city,
          order.postalCode,
          items,
          order.itemCount,
          order.total,
          order.paymentMethod,
          order.transactionId || '',
          order.customizationLink || '',
          order.customizationInstructions || '',
          order.storage_path || '',
        ]],
      },
    });
    return { syncedToSheets: true, reason: 'Success' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { syncedToSheets: false, reason: message };
  }
}

export async function syncCustomizationRecordToSheets(record: {
  requestId?: string;
  name: string;
  email: string;
  phone: string;
  category?: string;
  categoryName?: string;
  designSide?: string;
  placement?: string;
  fileName: string;
  uploadedAt: string;
  viewLink: string;
  instructions: string;
  storage_path: string;
}): Promise<SheetsSyncResult> {
  const client = getSheetsClient();
  if (!client) return { syncedToSheets: false, reason: 'Google Sheets not configured' };

  const { sheets, spreadsheetId } = client;
  await ensureSheet(sheets, spreadsheetId, CUSTOMIZATIONS_SHEET_NAME, CUSTOMIZATIONS_HEADER);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${CUSTOMIZATIONS_SHEET_NAME}!A:M`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          record.requestId || '',
          record.name,
          record.email,
          `'${record.phone}`,
          record.category || '',
          record.categoryName || '',
          record.designSide || '',
          record.placement || '',
          record.fileName,
          record.uploadedAt,
          record.viewLink,
          record.instructions,
          record.storage_path,
        ]],
      },
    });
    return { syncedToSheets: true, reason: 'Success' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { syncedToSheets: false, reason: message };
  }
}

export function getSpreadsheetUrl() {
  const spreadsheetId = getSpreadsheetId();
  return spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}` : null;
}
