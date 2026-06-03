import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { fetchProductById } from '@/lib/catalog';
import { breadcrumbJsonLd, buildPageMetadata, productJsonLd } from '@/lib/seo';

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    return buildPageMetadata({
      title: 'Product',
      description: 'Embroyit embroidered clothing UK.',
      path: `/shop/${id}`,
    });
  }

  return buildPageMetadata({
    title: `${product.name} — Embroidered ${product.category} UK`,
    description: `${product.description} Shop ${product.name} with premium custom embroidery from Embroyit UK.`,
    path: `/shop/${product.id}`,
    keywords: [
      `embroidered ${product.category} UK`,
      `custom embroidery ${product.category}`,
      product.name,
    ],
  });
}

export default async function ProductLayout({ children, params }: Props) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    return children;
  }

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Shop', path: '/shop' },
            { name: product.name, path: `/shop/${product.id}` },
          ]),
        ]}
      />
      {children}
    </>
  );
}
