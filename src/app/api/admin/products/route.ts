import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { resolveRole } from '@/lib/adminConfig';
import { deleteProduct, uploadProductMedia, upsertProduct } from '@/lib/catalog';
import type { Product } from '@/lib/catalog';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-expect-error role from session
    if (!session?.user?.email || resolveRole(session.user.email, session.user.role) !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();

    const id = (formData.get('id') as string) || `p_${Date.now()}`;
    const name = formData.get('name') as string;
    const category = formData.get('category') as string;
    const price = parseFloat(formData.get('price') as string);
    const description = formData.get('description') as string;
    const sizes = (formData.get('sizes') as string)?.split(',').map((s) => s.trim()).filter(Boolean) || [];
    const details =
      (formData.get('details') as string)?.split('\n').map((d) => d.trim()).filter(Boolean) || [];
    const fileCount = parseInt(formData.get('fileCount') as string) || 0;

    let imageUrls: string[] = [];
    let primaryImage = (formData.get('image') as string) || '';

    if (fileCount > 0) {
      for (let i = 0; i < fileCount; i++) {
        const file = formData.get(`file_${i}`) as File | null;
        if (!file || file.size === 0) continue;

        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'video/mp4',
          'video/webm',
          'video/quicktime',
        ];
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { error: 'Only JPEG, PNG and common video formats (MP4, WebM) are allowed' },
            { status: 400 }
          );
        }

        const uploaded = await uploadProductMedia(file);
        if (!uploaded?.url) {
          return NextResponse.json({ error: 'Failed to upload product media to Supabase' }, { status: 500 });
        }
        imageUrls.push(uploaded.url);
      }
    }

    if (imageUrls.length > 0) {
      primaryImage = imageUrls[0];
    }

    if (!primaryImage) {
      return NextResponse.json({ error: 'Product image is required' }, { status: 400 });
    }

    const product: Product = {
      id,
      name,
      category,
      price,
      description,
      sizes,
      details,
      image: primaryImage,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };

    const { product: saved, error } = await upsertProduct(product);
    if (error || !saved) {
      return NextResponse.json({ error: error || 'Failed to save product' }, { status: 500 });
    }

    return NextResponse.json({ success: true, product: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save failed';
    console.error('Save product error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // @ts-expect-error role from session
    if (!session?.user?.email || resolveRole(session.user.email, session.user.role) !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { ok, error } = await deleteProduct(id);
    if (!ok) {
      return NextResponse.json({ error: error || 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
