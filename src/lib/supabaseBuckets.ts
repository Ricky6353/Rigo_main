import { getSupabaseAdmin } from './supabase';

/** Supabase Storage buckets (create these in Supabase dashboard). */
export const SUPABASE_BUCKETS = {
  USERS: 'users',
  ORDERS: 'orders',
  CUSTOMIZATIONS: 'customizations',
  PRODUCTS: 'products',
  GALLERY: 'gallery',
  CATALOG: 'catalog',
} as const;

export type SupabaseBucketName = (typeof SUPABASE_BUCKETS)[keyof typeof SUPABASE_BUCKETS];

export async function uploadJsonToBucket(
  bucket: SupabaseBucketName,
  storagePath: string,
  payload: Record<string, unknown>
) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { ok: false, reason: 'Supabase admin client not configured' };
  }

  const body = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');

  const { error } = await supabaseAdmin.storage.from(bucket).upload(storagePath, body, {
    contentType: 'application/json',
    upsert: true,
  });

  if (error) {
    console.error(`Bucket upload failed (${bucket}/${storagePath}):`, error.message);
    return { ok: false, reason: error.message };
  }

  return { ok: true, storagePath };
}

export function getBucketPublicUrl(bucket: SupabaseBucketName, storagePath: string) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return null;
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}
