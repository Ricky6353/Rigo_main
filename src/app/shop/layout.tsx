import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Shop Embroidered Clothing UK — Hoodies, Tees & Polos',
  description:
    'Browse Embroyit embroidered streetwear in the UK: custom embroidery hoodies, embroidered t-shirts, polos and more. Premium stitch quality, shipped across the UK.',
  path: '/shop',
  keywords: [
    'shop embroidery clothing UK',
    'buy embroidered hoodies',
    'embroidered apparel online UK',
  ],
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
