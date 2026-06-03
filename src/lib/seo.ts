import type { Metadata } from 'next';

export const SITE_NAME = 'Embroyit';
export const SITE_TAGLINE = 'Premium Embroidered Streetwear UK';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
  'https://embroyit.com';

export const SEO_KEYWORDS = [
  'embroidery',
  'embroidery UK',
  'custom embroidery',
  'custom embroidery UK',
  'embroidered clothing UK',
  'embroidered hoodies UK',
  'embroidered t-shirts UK',
  'embroidered polos UK',
  'embroidery streetwear',
  'premium embroidery',
  'custom embroidered apparel',
  'embroidery on clothing',
  'bespoke embroidery UK',
  'Embroyit',
  'embroidered tees',
  'embroidered sweatshirt',
  'custom design embroidery',
  'UK embroidery shop',
  'online embroidery store',
];

export const DEFAULT_DESCRIPTION =
  'Embroyit offers premium custom embroidery and embroidered streetwear in the UK — hoodies, t-shirts, polos and bespoke designs. Shop custom embroidery clothing or upload your design.';

type PageMetaInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path = '',
  keywords = [],
  noIndex = false,
}: PageMetaInput): Metadata {
  const url = `${SITE_URL}${path.startsWith('/') ? path : path ? `/${path}` : ''}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  return {
    title: fullTitle,
    description,
    keywords: [...new Set([...SEO_KEYWORDS, ...keywords])],
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: 'website',
      locale: 'en_GB',
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
}

export const rootMetadata: Metadata = buildPageMetadata({
  title: `${SITE_NAME} — Custom Embroidery & Embroidered Streetwear UK`,
  description: DEFAULT_DESCRIPTION,
  path: '/',
  keywords: [
    'embroidery UK shop',
    'buy embroidered clothing UK',
    'custom embroidery service UK',
  ],
});

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/hero.png`,
    description: DEFAULT_DESCRIPTION,
    email: 'contact@embroyit.com',
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    sameAs: [],
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'en-GB',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function localBusinessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ClothingStore',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'UK-based premium embroidery and custom embroidered streetwear — hoodies, tees, polos and bespoke custom embroidery.',
    image: `${SITE_URL}/hero.png`,
    email: 'contact@embroyit.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'GB',
    },
    areaServed: 'GB',
    priceRange: '££',
  };
}

export function productJsonLd(product: {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}) {
  const imageUrl = product.image.startsWith('http') ? product.image : `${SITE_URL}${product.image}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: imageUrl,
    sku: product.id,
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: product.category,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'GBP',
      price: product.price,
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/shop/${product.id}`,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export const CATEGORY_SEO: Record<
  string,
  { title: string; description: string; keywords: string[] }
> = {
  tees: {
    title: 'Embroidered T-Shirts UK',
    description:
      'Shop premium embroidered t-shirts and custom embroidery tees at Embroyit UK. Oversize fits, high-density stitch work and bespoke designs.',
    keywords: ['embroidered t-shirts UK', 'embroidery tees', 'custom embroidery t-shirt'],
  },
  hoodies: {
    title: 'Embroidered Hoodies UK',
    description:
      'Premium embroidered hoodies with custom embroidery in the UK. Heavyweight cotton, detailed stitch landscapes and streetwear silhouettes.',
    keywords: ['embroidered hoodies UK', 'custom embroidery hoodie', 'embroidery on hoodies'],
  },
  polos: {
    title: 'Embroidered Polos UK',
    description:
      'Premium embroidered polos and custom embroidery polo shirts UK. Classic fits with meticulous Embroyit embroidery.',
    keywords: ['embroidered polos UK', 'custom embroidery polo', 'embroidery polo shirts'],
  },
  jeans: {
    title: 'Embroidered Jeans UK',
    description: 'Explore embroidered denim and custom embroidery jeans from Embroyit UK.',
    keywords: ['embroidered jeans UK', 'custom embroidery denim'],
  },
};
