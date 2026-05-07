import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { productId, soldOut, size } = await req.json();

    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    const dataPath = path.join(process.cwd(), 'src', 'data', 'products.json');
    const products = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const productIndex = products.findIndex((p: any) => p.id === productId);

    if (productIndex === -1) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    if (size) {
      // Size-level toggle
      if (!products[productIndex].soldOutSizes) {
        products[productIndex].soldOutSizes = [];
      }
      
      if (soldOut) {
        if (!products[productIndex].soldOutSizes.includes(size)) {
          products[productIndex].soldOutSizes.push(size);
        }
      } else {
        products[productIndex].soldOutSizes = products[productIndex].soldOutSizes.filter((s: string) => s !== size);
      }
      
      const message = `Size ${size} marked as ${soldOut ? 'sold out' : 'in stock'}`;
      fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
      return NextResponse.json({ success: true, product: products[productIndex], message });
    } else {
      // Product-level toggle
      products[productIndex].soldOut = soldOut;
      const message = `Product marked as ${soldOut ? 'sold out' : 'in stock'}`;
      fs.writeFileSync(dataPath, JSON.stringify(products, null, 2));
      return NextResponse.json({ success: true, product: products[productIndex], message });
    }
  } catch (err: any) {
    console.error('Toggle sold out error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
