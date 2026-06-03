import { NextResponse } from 'next/server';
import { fetchAllCategories, upsertCategory, deleteCategory } from '@/lib/catalog';

export async function GET() {
  try {
    const categories = await fetchAllCategories();
    return NextResponse.json(categories);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load categories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const id = name.toLowerCase().replace(/\s+/g, '-');
    const categories = await fetchAllCategories();

    if (categories.find((c) => c.id === id)) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    const { category, error } = await upsertCategory({ id, name });
    if (error || !category) {
      return NextResponse.json({ error: error || 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ success: true, category });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const { ok, error } = await deleteCategory(id);
    if (!ok) {
      return NextResponse.json({ error: error || 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete category';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
