import { NextResponse } from 'next/server';
import { persistAndSyncOrder, fetchOrdersFromSupabase } from '@/lib/orderPipeline';
import { getSpreadsheetUrl } from '@/lib/sheetsSync';

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
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');
  const period = (url.searchParams.get('period') as 'day' | 'week') || 'week';
  const today = new Date().toISOString().slice(0, 10);
  const targetDate = dateParam || today;
  const { start, end } = getDateRange(targetDate, period);

  try {
    const { orders, error } = await fetchOrdersFromSupabase({ startDate: start, endDate: end });
    if (error) {
      return NextResponse.json({
        orders: [],
        spreadsheetUrl: getSpreadsheetUrl(),
        message: error,
      });
    }

    return NextResponse.json({
      orders,
      spreadsheetUrl: getSpreadsheetUrl(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to load orders';
    console.error('Order GET failed:', message);
    return NextResponse.json({
      orders: [],
      spreadsheetUrl: getSpreadsheetUrl(),
      error: message,
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
    itemCount: payload.items.reduce((sum: number, item: { quantity?: number }) => sum + Number(item.quantity || 0), 0),
    total: payload.total ?? 0,
    paymentMethod: payload.paymentMethod || 'unknown',
    transactionId: payload.transactionId || '',
    customizationLink: payload.customizationLink || '',
    customizationInstructions: payload.customizationInstructions || '',
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
      persistedToBucket: result.bucketResult.ok,
      syncedToSheets: result.sheetResult.syncedToSheets,
      dbDuplicate: Boolean(result.dbResult.duplicate),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to save order';
    console.error('Order POST failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
