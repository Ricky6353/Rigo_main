import { redirect, notFound } from 'next/navigation';
import { fetchProductById } from '@/lib/catalog';
import ProductDetailClient from './ProductDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CATEGORY_SLUGS = ['tees', 'polos', 'hoodies'];

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categorySlug = id === 'sweatshirt' ? 'polos' : id;

  if (CATEGORY_SLUGS.includes(categorySlug) || id === 'sweatshirt') {
    redirect(`/shop?category=${categorySlug}`);
  }

  const product = await fetchProductById(id);
  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
