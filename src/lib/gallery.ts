import { getSupabaseAdmin, getSupabaseReadClient, logInvalidServiceKeyHint } from './supabase';

export type GalleryItem = {
  id: number;
  url: string;
  storagePath: string;
  mimeType: string | null;
  sortOrder: number;
  createdAt: string;
};

type GalleryRow = {
  id: number;
  url: string;
  storage_path: string;
  mime_type: string | null;
  sort_order: number | null;
  created_at: string;
};

function mapGalleryItem(row: GalleryRow): GalleryItem {
  return {
    id: row.id,
    url: row.url,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export async function fetchGalleryItems(): Promise<GalleryItem[]> {
  const client = getSupabaseReadClient() ?? getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from('gallery_items')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    logInvalidServiceKeyHint(error.message);
    console.error('fetchGalleryItems error:', error.message);
    return [];
  }

  return (data as GalleryRow[]).map(mapGalleryItem);
}

export async function createGalleryItem(input: {
  url: string;
  storagePath: string;
  mimeType?: string;
}): Promise<{ item: GalleryItem | null; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { item: null, error: 'Supabase not configured' };

  const { data, error } = await supabaseAdmin
    .from('gallery_items')
    .insert([
      {
        url: input.url,
        storage_path: input.storagePath,
        mime_type: input.mimeType || null,
      },
    ])
    .select()
    .single();

  if (error) return { item: null, error: error.message };
  return { item: mapGalleryItem(data as GalleryRow) };
}
