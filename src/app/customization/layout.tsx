import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Custom Embroidery UK — Upload Your Design',
  description:
    'Order custom embroidery in the UK with Embroyit. Upload your design PDF, add your details, and our team will bring your embroidered vision to life on premium apparel.',
  path: '/customization',
  keywords: [
    'custom embroidery UK',
    'upload embroidery design',
    'bespoke embroidery service',
    'custom embroidered clothing order',
  ],
});

export default function CustomizationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
