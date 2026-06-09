import { NextResponse } from 'next/server';
import { fetchAllProducts } from '@/lib/catalog';
import { CATALOG_CACHE_HEADERS } from '@/lib/apiCache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const products = await fetchAllProducts();
    return NextResponse.json(products, { headers: CATALOG_CACHE_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load products';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
