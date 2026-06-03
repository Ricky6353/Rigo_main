import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Embroidery Lookbook — Embroyit Collections',
  description:
    'Explore the Embroyit lookbook: premium embroidered streetwear, custom embroidery inspiration and seasonal collections from our UK embroidery studio.',
  path: '/lookbook',
  keywords: ['embroidery lookbook', 'embroidered fashion UK', 'streetwear embroidery'],
});

export default function LookbookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
