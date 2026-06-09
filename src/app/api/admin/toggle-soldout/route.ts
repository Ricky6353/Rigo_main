import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { resolveRole } from '@/lib/adminConfig';
import { updateProductSoldOut } from '@/lib/catalog';
import { revalidateCatalogPages } from '@/lib/revalidateCatalog';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || resolveRole(session.user.email, session.user.role) !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, soldOut, size } = await req.json();

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const { product, error } = await updateProductSoldOut(productId, { soldOut, size });
    if (error || !product) {
      return NextResponse.json({ success: false, error: error || 'Product not found' }, { status: 404 });
    }

    const message = size
      ? `Size ${size} marked as ${soldOut ? 'sold out' : 'in stock'}`
      : `Product marked as ${soldOut ? 'sold out' : 'in stock'}`;

    revalidateCatalogPages();
    return NextResponse.json({ success: true, product, message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Toggle failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
