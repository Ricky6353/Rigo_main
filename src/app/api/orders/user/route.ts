import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const client = await getMongoClient();
    const dbName = process.env.MONGODB_DB;

    if (!client || !dbName) {
      return NextResponse.json({ orders: [], message: 'Database not configured' });
    }

    const collection = client.db(dbName).collection('orders');
    
    // Find orders where either 'email' or 'emailId' matches the provided email
    const orders = await collection
      .find({
        $or: [
          { email: email },
          { emailId: email }
        ]
      })
      .sort({ createdAt: -1 }) // Show latest orders first
      .toArray();

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Failed to fetch user orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
