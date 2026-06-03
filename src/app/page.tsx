import HomeClient from './HomeClient';
import { rootMetadata } from '@/lib/seo';

export const metadata = rootMetadata;

export default function HomePage() {
  return <HomeClient />;
}
