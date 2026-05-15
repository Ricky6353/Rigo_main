import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { persistAndSyncOrder } from '@/lib/orderPipeline';

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

function getGoogleAuth() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_ORDERS_SPREADSHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    return null;
  }

  // Handle case where key might be wrapped in quotes or have escaped newlines
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
  // Clean up private key - ensure newlines are correct
  const formattedKey = privateKey.replace(/\\n/g, '\n');

  // Simple check for placeholder values
  if (formattedKey.includes('Your\nVery\nLong')) {
    console.warn('Google Private Key placeholder detected. Please update .env.local with your real key.');
    return null;
  }

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    return { sheets, spreadsheetId };
  } catch (err) {
    console.error('Failed to initialize Google Auth:', err);
    return null;
  }
}

async function ensureSheetAndHeader(sheets: any, spreadsheetId: string) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const titleExists = metadata.data.sheets?.some((sheet: any) => sheet.properties?.title === ORDERS_SHEET_NAME);

  if (!titleExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: ORDERS_SHEET_NAME,
              },
            },
          },
        ],
      },
    });
  }

  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${ORDERS_SHEET_NAME}!A1:O1`,
  });

  const currentHeader = headerResponse.data.values?.[0] || [];
  if (!currentHeader.length || currentHeader[0] !== HEADER_ROW[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${ORDERS_SHEET_NAME}!A1:O1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [HEADER_ROW],
      },
    });
  }
}

function parseSheetRows(rows: any[][]) {
  const dataRows = rows[0]?.[0] === HEADER_ROW[0] ? rows.slice(1) : rows;
  return dataRows.map((row) => {
    const isNewFormat = row.length >= 14;
    
    if (isNewFormat) {
      return {
        orderId: row[0] ?? '',
        orderDate: row[1] ?? '',
        customerName: row[2] ?? '',
        contact: row[3] ?? '',
        phoneNumber: row[4] ?? '',
        email: row[5] ?? '',
        emailId: row[6] ?? '',
        address: row[7] ?? '',
        city: row[8] ?? '',
        postalCode: row[9] ?? '',
        items: (row[10] ?? '').split(' | ').map((item: string) => {
          const [namePart, qtyPart] = item.split(' x');
          const sizeMatch = namePart.match(/\(([^)]+)\)$/);
          const size = sizeMatch ? sizeMatch[1] : '';
          const name = sizeMatch ? namePart.replace(/\s\([^)]+\)$/, '') : namePart;
          return { name: name || '', quantity: Number(qtyPart || 0), size: size || undefined };
        }),
        itemCount: Number(row[11] ?? 0),
        total: Number(row[12] ?? 0),
        paymentMethod: row[13] ?? '',
        transactionId: row[14] ?? '',
        customizationLink: row[15] ?? '',
        customizationInstructions: row[16] ?? '',
      };
    } else {
      // Old format (12 columns)
      return {
        orderId: row[0] ?? '',
        orderDate: row[1] ?? '',
        customerName: row[2] ?? '',
        contact: row[3] ?? '',
        email: row[4] ?? '',
        address: row[5] ?? '',
        city: row[6] ?? '',
        postalCode: row[7] ?? '',
        items: (row[8] ?? '').split(' | ').map((item: string) => {
          const [namePart, qtyPart] = item.split(' x');
          const sizeMatch = namePart.match(/\(([^)]+)\)$/);
          const size = sizeMatch ? sizeMatch[1] : '';
          const name = sizeMatch ? namePart.replace(/\s\([^)]+\)$/, '') : namePart;
          return { name: name || '', quantity: Number(qtyPart || 0), size: size || undefined };
        }),
        itemCount: Number(row[9] ?? 0),
        total: Number(row[10] ?? 0),
        paymentMethod: row[11] ?? '',
      };
    }
  });
}

function getDateRange(dateString: string, period: 'day' | 'week') {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    const fallback = new Date();
    return { start: fallback.toISOString().slice(0, 10), end: fallback.toISOString().slice(0, 10) };
  }

  if (period === 'week') {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(date);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return {
      start: startOfWeek.toISOString().slice(0, 10),
      end: endOfWeek.toISOString().slice(0, 10),
    };
  }

  const singleDay = date.toISOString().slice(0, 10);
  return { start: singleDay, end: singleDay };
}

export async function GET(request: Request) {
  const auth = getGoogleAuth();
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');
  const period = (url.searchParams.get('period') as 'day' | 'week') || 'week';
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = dateParam || today;
  const { start, end } = getDateRange(targetDate, period);

  if (!auth) {
    return NextResponse.json({
      orders: [],
      spreadsheetUrl: null,
      message: 'Google credentials not configured for order reporting.',
    });
  }

  try {
    const { sheets, spreadsheetId } = auth;
    await ensureSheetAndHeader(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ORDERS_SHEET_NAME}!A1:O`,
    });

    const rows = response.data.values || [];
    const parsedOrders = parseSheetRows(rows).filter((order) => {
      const orderDate = order.orderDate?.slice(0, 10);
      return orderDate >= start && orderDate <= end;
    });
    return NextResponse.json({
      orders: parsedOrders,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    });
  } catch (error: any) {
    console.error('Order GET failed:', error);
    return NextResponse.json({
      orders: [],
      spreadsheetUrl: null,
      error: error.message || 'Unable to load orders',
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const payload = await request.json();

  if (!payload?.customerName || !payload?.email || !payload?.address || !payload?.items?.length) {
    return NextResponse.json({ error: 'Missing order fields' }, { status: 400 });
  }

  const orderPayload = {
    orderId: `ORD-${Date.now()}`,
    orderDate: payload.orderDate || new Date().toISOString(),
    customerName: payload.customerName,
    contact: payload.contact || payload.phoneNumber || '',
    phoneNumber: payload.phoneNumber || payload.contact || '',
    email: payload.email || payload.emailId || '',
    emailId: payload.emailId || payload.email || '',
    address: payload.address,
    city: payload.city || '',
    postalCode: payload.postalCode || '',
    items: payload.items,
    itemCount: payload.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
    total: payload.total ?? 0,
    paymentMethod: payload.paymentMethod || 'unknown',
    transactionId: payload.transactionId || '',
  };

  try {
    const result = await persistAndSyncOrder({
      ...orderPayload,
      source: payload.source || 'checkout_form',
      status: payload.status || 'paid',
    });

    return NextResponse.json({
      success: true,
      orderId: result.order.orderId,
      persistedToDb: result.dbResult.persistedToDb,
      syncedToSheets: result.sheetResult.syncedToSheets,
      dbDuplicate: (result.dbResult as any).duplicate || false,
    });
  } catch (error: any) {
    console.error('Order POST failed:', error);
    return NextResponse.json({ error: error.message || 'Unable to save order' }, { status: 500 });
  }
}
