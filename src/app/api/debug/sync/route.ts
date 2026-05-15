import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { persistAndSyncOrder } from '@/lib/orderPipeline';

export async function GET() {
  try {
    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DB;

    if (!client || !dbName) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const collection = client.db(dbName).collection('orders');
    const allOrders = await collection.find({}).toArray();

    const results = [];
    for (const order of allOrders) {
      // Use the existing pipeline which handles de-duplication automatically
      const result = await persistAndSyncOrder(order as any);
      results.push({
        id: order.orderId,
        synced: result.sheetResult.syncedToSheets,
        reason: result.sheetResult.reason
      });
    }

    return NextResponse.json({
      message: `Bulk sync processed ${allOrders.length} orders.`,
      details: results
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
