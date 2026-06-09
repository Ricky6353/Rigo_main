import HomeClient from './HomeClient';
import { rootMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = rootMetadata;

export default function HomePage() {
  return <HomeClient />;
}
