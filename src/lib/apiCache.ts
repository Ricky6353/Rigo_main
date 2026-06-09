/** Prevent CDN/browser caching of live catalog API responses. */
export const CATALOG_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
} as const;
