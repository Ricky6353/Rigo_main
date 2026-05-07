import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CATEGORIES_PATH = path.join(process.cwd(), 'src', 'data', 'categories.json');

function getCategories() {
  if (!fs.existsSync(CATEGORIES_PATH)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf-8'));
}

export async function GET() {
  try {
    return NextResponse.json(getCategories());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const categories = getCategories();
    const id = name.toLowerCase().replace(/\s+/g, '-');

    if (categories.find((c: any) => c.id === id)) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
    }

    const newCategory = { id, name };
    categories.push(newCategory);
    fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2));

    return NextResponse.json({ success: true, category: newCategory });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    let categories = getCategories();
    categories = categories.filter((c: any) => c.id !== id);

    fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
