import { revalidatePath } from 'next/cache';

/** Bust Next.js static cache after Command Center catalog changes. */
export function revalidateCatalogPages() {
  revalidatePath('/', 'page');
  revalidatePath('/shop', 'page');
  revalidatePath('/shop', 'layout');
}
