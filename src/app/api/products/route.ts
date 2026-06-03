import { NextResponse } from 'next/server';
import { fetchAllProducts } from '@/lib/catalog';

export async function GET() {
  try {
    const products = await fetchAllProducts();
    return NextResponse.json(products);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
