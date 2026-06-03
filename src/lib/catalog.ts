import { getSupabaseAdmin, getSupabaseReadClient, logInvalidServiceKeyHint } from './supabase';
import { SUPABASE_BUCKETS, getBucketPublicUrl } from './supabaseBuckets';

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  sizes?: string[];
  details: string[];
  soldOut?: boolean;
  soldOutSizes?: string[];
  images?: string[];
};

export type Category = {
  id: string;
  name: string;
};

type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  sizes: string[] | null;
  details: string[] | null;
  image: string;
  images: string[] | null;
  sold_out: boolean | null;
  sold_out_sizes: string[] | null;
};

export function mapProductFromRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    description: row.description,
    sizes: row.sizes || undefined,
    details: row.details || [],
    image: row.image,
    images: row.images || undefined,
    soldOut: Boolean(row.sold_out),
    soldOutSizes: row.sold_out_sizes || undefined,
  };
}

function mapProductToRow(product: Product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    description: product.description,
    sizes: product.sizes || [],
    details: product.details || [],
    image: product.image,
    images: product.images || [],
    sold_out: Boolean(product.soldOut),
    sold_out_sizes: product.soldOutSizes || [],
    updated_at: new Date().toISOString(),
  };
}

function isMissingTableError(message: string) {
  return message.includes('schema cache') || message.includes('does not exist');
}

/** Public catalog tables allow anon SELECT; avoids broken service key on Vercel. */
function getCatalogReadClient() {
  return getSupabaseReadClient() ?? getSupabaseAdmin();
}

async function downloadCatalogJson<T>(filename: string, fallback: T): Promise<T> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return fallback;

  const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.CATALOG).download(`data/${filename}`);
  if (error || !data) return fallback;

  const text = await data.text();
  return JSON.parse(text) as T;
}

async function uploadCatalogJson(filename: string, payload: unknown) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return false;

  const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
  const { error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.CATALOG).upload(`data/${filename}`, body, {
    contentType: 'application/json',
    upsert: true,
  });
  return !error;
}

export async function fetchAllProducts(): Promise<Product[]> {
  const client = getCatalogReadClient();
  if (!client) return [];

  const { data, error } = await client.from('products').select('*').order('name');
  if (!error && data) {
    return (data as ProductRow[]).map(mapProductFromRow);
  }

  if (error && !isMissingTableError(error.message)) {
    logInvalidServiceKeyHint(error.message);
    console.error('fetchAllProducts error:', error.message);
  }

  return downloadCatalogJson<Product[]>('products.json', []);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const products = await fetchAllProducts();
  return products.find((p) => p.id === id) || null;
}

export async function upsertProduct(product: Product): Promise<{ product: Product | null; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { product: null, error: 'Supabase not configured' };

  const { data, error } = await supabaseAdmin
    .from('products')
    .upsert([mapProductToRow(product)], { onConflict: 'id' })
    .select()
    .single();

  if (!error && data) {
    return { product: mapProductFromRow(data as ProductRow) };
  }

  if (error && !isMissingTableError(error.message)) {
    return { product: null, error: error.message };
  }

  const products = await fetchAllProducts();
  const index = products.findIndex((p) => p.id === product.id);
  if (index >= 0) products[index] = product;
  else products.push(product);

  const saved = await uploadCatalogJson('products.json', products);
  if (!saved) return { product: null, error: 'Failed to save product to Supabase catalog storage' };
  return { product };
}

export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { ok: false, error: 'Supabase not configured' };

  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (!error) return { ok: true };

  if (error && !isMissingTableError(error.message)) {
    return { ok: false, error: error.message };
  }

  const products = (await fetchAllProducts()).filter((p) => p.id !== id);
  const saved = await uploadCatalogJson('products.json', products);
  return saved ? { ok: true } : { ok: false, error: 'Failed to delete product from catalog storage' };
}

export async function updateProductSoldOut(
  productId: string,
  options: { soldOut?: boolean; size?: string }
): Promise<{ product: Product | null; error?: string }> {
  const product = await fetchProductById(productId);
  if (!product) return { product: null, error: 'Product not found' };

  if (options.size) {
    const soldOutSizes = [...(product.soldOutSizes || [])];
    if (options.soldOut) {
      if (!soldOutSizes.includes(options.size)) soldOutSizes.push(options.size);
    } else {
      product.soldOutSizes = soldOutSizes.filter((s) => s !== options.size);
      return upsertProduct(product);
    }
    product.soldOutSizes = soldOutSizes;
  } else if (typeof options.soldOut === 'boolean') {
    product.soldOut = options.soldOut;
  }

  return upsertProduct(product);
}

export async function fetchAllCategories(): Promise<Category[]> {
  const client = getCatalogReadClient();
  if (!client) return [];

  const { data, error } = await client.from('categories').select('*').order('name');
  if (!error && data) return data as Category[];

  if (error && !isMissingTableError(error.message)) {
    logInvalidServiceKeyHint(error.message);
    console.error('fetchAllCategories error:', error.message);
  }

  return downloadCatalogJson<Category[]>('categories.json', []);
}

export async function upsertCategory(category: Category): Promise<{ category: Category | null; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { category: null, error: 'Supabase not configured' };

  const { data, error } = await supabaseAdmin
    .from('categories')
    .upsert([category], { onConflict: 'id' })
    .select()
    .single();

  if (!error && data) return { category: data as Category };

  if (error && !isMissingTableError(error.message)) {
    return { category: null, error: error.message };
  }

  const categories = await fetchAllCategories();
  const index = categories.findIndex((c) => c.id === category.id);
  if (index >= 0) categories[index] = category;
  else categories.push(category);

  const saved = await uploadCatalogJson('categories.json', categories);
  if (!saved) return { category: null, error: 'Failed to save category to catalog storage' };
  return { category };
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { ok: false, error: 'Supabase not configured' };

  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
  if (!error) return { ok: true };

  if (error && !isMissingTableError(error.message)) {
    return { ok: false, error: error.message };
  }

  const categories = (await fetchAllCategories()).filter((c) => c.id !== id);
  const saved = await uploadCatalogJson('categories.json', categories);
  return saved ? { ok: true } : { ok: false, error: 'Failed to delete category from catalog storage' };
}

export async function uploadProductMedia(file: File): Promise<{ url: string; path: string } | null> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const ext = file.name.split('.').pop() || 'bin';
  const safeName = file.name.replace(/\s+/g, '_').toLowerCase();
  const storagePath = `media/${Date.now()}_${safeName}`;

  const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.PRODUCTS).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || `application/${ext}`,
  });

  if (error) {
    console.error('uploadProductMedia error:', error.message);
    return null;
  }

  return {
    path: data.path,
    url: getBucketPublicUrl(SUPABASE_BUCKETS.PRODUCTS, data.path) || '',
  };
}

export async function uploadGalleryMedia(file: File): Promise<{ url: string; path: string } | null> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const safeName = file.name.replace(/\s+/g, '_').toLowerCase();
  const storagePath = `media/${Date.now()}_${safeName}`;

  const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.GALLERY).upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (error) {
    console.error('uploadGalleryMedia error:', error.message);
    return null;
  }

  return {
    path: data.path,
    url: getBucketPublicUrl(SUPABASE_BUCKETS.GALLERY, data.path) || '',
  };
}

export async function uploadLocalFileToProductsBucket(
  localPath: string,
  storagePath: string,
  contentType: string
): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;

  const fs = await import('fs');
  if (!fs.existsSync(localPath)) return null;

  const buffer = fs.readFileSync(localPath);
  const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.PRODUCTS).upload(storagePath, buffer, {
    cacheControl: '3600',
    upsert: true,
    contentType,
  });

  if (error) {
    console.error('uploadLocalFileToProductsBucket error:', error.message);
    return null;
  }

  return getBucketPublicUrl(SUPABASE_BUCKETS.PRODUCTS, data.path);
}
