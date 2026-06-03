import { Suspense } from 'react';
import ShopClient from './ShopClient';
import JsonLd from '@/components/JsonLd';
import { fetchAllCategories, fetchAllProducts } from '@/lib/catalog';
import { SITE_URL } from '@/lib/seo';

export default async function ShopPage() {
  const [products, categories] = await Promise.all([fetchAllProducts(), fetchAllCategories()]);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Embroyit embroidered clothing UK',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/shop/${product.id}`,
      name: product.name,
    })),
  };

  return (
    <>
      <JsonLd data={itemListJsonLd} />
      <Suspense fallback={<div style={{ padding: '100px', textAlign: 'center' }}>Loading Collections...</div>}>
        <ShopClient initialProducts={products} dynamicCategories={categories} />
      </Suspense>
    </>
  );
}
