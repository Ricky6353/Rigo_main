import { NextResponse } from 'next/server';
import { fetchOrdersFromSupabase } from '@/lib/orderPipeline';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const { orders, error } = await fetchOrdersFromSupabase({ email });
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Failed to fetch user orders:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
