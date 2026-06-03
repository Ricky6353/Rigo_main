import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { mapOrderFromSupabase } from '@/lib/orderPipeline';
import { syncOrderRecordToSheets } from '@/lib/sheetsSync';
import { SUPABASE_BUCKETS, uploadJsonToBucket } from '@/lib/supabaseBuckets';

/** Re-sync all Supabase orders to the orders bucket + Google Sheets (no MongoDB). */
export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const { data: rows, error } = await supabaseAdmin.from('orders').select('*');
    if (error) throw error;

    const results = [];
    for (const row of rows || []) {
      const order = mapOrderFromSupabase(row);
      const storagePath = `records/${order.orderId}.json`;

      await uploadJsonToBucket(SUPABASE_BUCKETS.ORDERS, storagePath, {
        ...order,
        supabase_id: row.id,
        storage_path: storagePath,
        resyncedAt: new Date().toISOString(),
      });

      const sheetResult = await syncOrderRecordToSheets({ ...order, storage_path: storagePath });
      results.push({
        id: order.orderId,
        synced: sheetResult.syncedToSheets,
        reason: sheetResult.reason,
      });
    }

    return NextResponse.json({
      message: `Re-synced ${results.length} orders from Supabase to bucket + Sheets.`,
      details: results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
