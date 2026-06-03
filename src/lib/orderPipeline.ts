import { getSupabaseAdmin } from '@/lib/supabase';
import { SUPABASE_BUCKETS, uploadJsonToBucket } from './supabaseBuckets';
import { syncOrderRecordToSheets } from './sheetsSync';

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

function orderStoragePath(orderId: string) {
  return `records/${orderId}.json`;
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

/** Map Supabase row (snake_case) to API camelCase. */
export function mapOrderFromSupabase(row: Record<string, unknown>): OrderInput & { id?: string | number } {
  return {
    id: row.id as string | number | undefined,
    orderId: (row.order_id as string) || '',
    orderDate: (row.order_date as string) || '',
    customerName: (row.customer_name as string) || '',
    contact: (row.contact as string) || (row.phone_number as string) || '',
    phoneNumber: (row.phone_number as string) || (row.contact as string) || '',
    email: (row.email as string) || '',
    emailId: (row.email as string) || '',
    address: (row.address as string) || '',
    city: (row.city as string) || '',
    postalCode: (row.postal_code as string) || '',
    items: (row.items as OrderItemInput[]) || [],
    itemCount: Number(row.item_count ?? 0),
    total: Number(row.total ?? 0),
    paymentMethod: (row.payment_method as string) || '',
    transactionId: (row.transaction_id as string) || '',
    stripeSessionId: row.stripe_session_id as string | undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id as string | null | undefined,
    status: (row.status as string) || 'paid',
    source: (row.source as string) || 'web',
    customizationLink: (row.customization_link as string) || '',
    customizationInstructions: (row.customization_instructions as string) || '',
  };
}

async function saveOrderToSupabase(order: OrderInput) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { persistedToDb: false, reason: 'Supabase admin client not initialized' };
  }

  try {
    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .or(`order_id.eq.${order.orderId}${order.stripeSessionId ? `,stripe_session_id.eq.${order.stripeSessionId}` : ''}`)
      .maybeSingle();

    if (existingOrder) {
      return { persistedToDb: true, duplicate: true, insertedId: existingOrder.id };
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([
        {
          order_id: order.orderId,
          order_date: order.orderDate,
          customer_name: order.customerName,
          contact: order.contact,
          phone_number: order.phoneNumber,
          email: order.email,
          address: order.address,
          city: order.city,
          postal_code: order.postalCode,
          items: order.items,
          item_count: order.itemCount,
          total: order.total,
          payment_method: order.paymentMethod,
          transaction_id: order.transactionId,
          stripe_session_id: order.stripeSessionId,
          stripe_payment_intent_id: order.stripePaymentIntentId,
          status: order.status,
          source: order.source,
          customization_link: order.customizationLink,
          customization_instructions: order.customizationInstructions,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return { persistedToDb: true, duplicate: false, insertedId: data.id, row: data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Supabase order save error:', message);
    return { persistedToDb: false, reason: message };
  }
}

async function saveOrderJsonToBucket(order: OrderInput, supabaseRowId?: string | number) {
  const storagePath = orderStoragePath(order.orderId);
  const payload = {
    ...order,
    supabase_id: supabaseRowId,
    storage_path: storagePath,
    syncedAt: new Date().toISOString(),
  };
  const bucketResult = await uploadJsonToBucket(SUPABASE_BUCKETS.ORDERS, storagePath, payload);
  return {
    ok: bucketResult.ok,
    reason: bucketResult.ok ? 'Success' : bucketResult.reason || 'Upload failed',
    storagePath,
  };
}

/** Step 1: Supabase DB + orders bucket. Step 2: Google Sheets from Supabase record. */
export async function persistAndSyncOrder(payload: Partial<OrderInput>) {
  const order = normalizeOrder(payload);
  console.log(`Processing order ${order.orderId} from ${order.source}...`);

  let dbResult: Record<string, unknown> = { persistedToDb: false, reason: 'Pending' };
  try {
    dbResult = await saveOrderToSupabase(order);
    console.log(
      `DB persistence for ${order.orderId}: ${dbResult.persistedToDb ? 'SUCCESS' : 'FAILED'} (${dbResult.reason || 'ok'})`
    );
  } catch (dbErr: unknown) {
    const message = dbErr instanceof Error ? dbErr.message : 'Unknown error';
    console.error(`Critical DB Error for ${order.orderId}:`, message);
    dbResult = { persistedToDb: false, reason: message };
  }

  let bucketResult = { ok: false, reason: 'DB save required first', storagePath: orderStoragePath(order.orderId) };
  if (dbResult.persistedToDb) {
    bucketResult = await saveOrderJsonToBucket(order, dbResult.insertedId as string | number);
  }

  let sheetResult = { syncedToSheets: false, reason: 'Pending' };
  if (dbResult.persistedToDb && !dbResult.duplicate) {
    sheetResult = await syncOrderRecordToSheets({
      ...order,
      storage_path: bucketResult.storagePath,
    });
    console.log(`Sheet sync for ${order.orderId}: ${sheetResult.syncedToSheets ? 'SUCCESS' : 'FAILED'}`);
  } else if (dbResult.duplicate) {
    sheetResult = { syncedToSheets: false, reason: 'Duplicate order — skipped Sheets append' };
  }

  return { order, dbResult, bucketResult, sheetResult };
}

export async function fetchOrdersFromSupabase(options?: {
  startDate?: string;
  endDate?: string;
  email?: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { orders: [], error: 'Supabase not configured' };
  }

  let query = supabaseAdmin.from('orders').select('*').order('order_date', { ascending: false });

  if (options?.email) {
    const email = options.email.trim().toLowerCase();
    query = query.eq('email', email);
  }

  const { data, error } = await query;
  if (error) throw error;

  let orders = (data || []).map((row) => mapOrderFromSupabase(row));

  if (options?.startDate && options?.endDate) {
    orders = orders.filter((order) => {
      const orderDate = order.orderDate?.slice(0, 10);
      return orderDate >= options.startDate! && orderDate <= options.endDate!;
    });
  }

  return { orders, error: null };
}
