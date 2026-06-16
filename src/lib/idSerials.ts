import { getSupabaseAdmin } from '@/lib/supabase';

const ORDER_PREFIX = 'embroy';
const ORDER_DIGITS = 14;
const CUSTOM_PREFIX = 'custom-';
const CUSTOM_DIGITS = 11;

function extractNumericSuffix(value: string, prefix: string) {
  if (!value.startsWith(prefix)) return null;
  const suffix = value.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  return Number.parseInt(suffix, 10);
}

function formatSerial(prefix: string, digits: number, serial: number) {
  return `${prefix}${serial.toString().padStart(digits, '0')}`;
}

export async function generateNextOrderId() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return formatSerial(ORDER_PREFIX, ORDER_DIGITS, 1);
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('order_id')
    .like('order_id', `${ORDER_PREFIX}%`)
    .order('order_id', { ascending: false })
    .limit(200);

  if (error || !data) {
    return formatSerial(ORDER_PREFIX, ORDER_DIGITS, 1);
  }

  let max = 0;
  for (const row of data) {
    const parsed = extractNumericSuffix((row.order_id as string) || '', ORDER_PREFIX);
    if (parsed && parsed > max) max = parsed;
  }

  return formatSerial(ORDER_PREFIX, ORDER_DIGITS, max + 1);
}

export async function generateNextCustomizationRequestId() {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return formatSerial(CUSTOM_PREFIX, CUSTOM_DIGITS, 1);
  }

  const { data, error } = await supabaseAdmin
    .from('customization_files')
    .select('metadata')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data) {
    return formatSerial(CUSTOM_PREFIX, CUSTOM_DIGITS, 1);
  }

  let max = 0;
  for (const row of data) {
    const metadata = row.metadata as Record<string, unknown> | null;
    const rawId = typeof metadata?.requestId === 'string' ? metadata.requestId : '';
    const parsed = extractNumericSuffix(rawId, CUSTOM_PREFIX);
    if (parsed && parsed > max) max = parsed;
  }

  return formatSerial(CUSTOM_PREFIX, CUSTOM_DIGITS, max + 1);
}
