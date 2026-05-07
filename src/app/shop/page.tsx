import fs from 'fs';
import path from 'path';
import { Suspense } from 'react';
import ShopClient from './ShopClient';

export default async function ShopPage() {
  // Fetch products & categories directly on the server from the JSON files
  const dataPath = path.join(process.cwd(), 'src', 'data', 'products.json');
  const catPath = path.join(process.cwd(), 'src', 'data', 'categories.json');
  
  let products = [];
  let categories = [];
  
  try {
    products = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    categories = JSON.parse(fs.readFileSync(catPath, 'utf8'));
  } catch (err) {
    console.error('Error reading data:', err);
  }

  return (
    <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center' }}>Loading Collections...</div>}>
      <ShopClient initialProducts={products} dynamicCategories={categories} />
    </Suspense>
  );
}
