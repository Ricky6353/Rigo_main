import { supabase, getSupabaseAdmin } from './supabase';
import { SUPABASE_BUCKETS, uploadJsonToBucket, getBucketPublicUrl } from './supabaseBuckets';
import { syncCustomizationRecordToSheets } from './sheetsSync';

export interface SupabaseFileResult {
  fileId: string;
  viewLink: string;
  storagePath: string;
}

const BUCKET_NAME = SUPABASE_BUCKETS.CUSTOMIZATIONS;

function metadataStoragePath(filePath: string) {
  return `records/${filePath.replace(/\//g, '_')}.json`;
}

export async function uploadToSupabase(
  file: File,
  metadata: Record<string, string> = {}
): Promise<SupabaseFileResult> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabase || !supabaseAdmin) {
    throw new Error('Supabase configuration missing');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const viewLink = getBucketPublicUrl(BUCKET_NAME, data.path) || '';
  const uploadedAt = new Date().toISOString();

  const { data: metaRow, error: metaError } = await supabaseAdmin
    .from('customization_files')
    .insert([
      {
        file_id: data.path,
        file_name: file.name,
        mime_type: file.type,
        size: file.size,
        path: data.path,
        metadata: {
          ...metadata,
          view_link: viewLink,
          uploaded_at: uploadedAt,
        },
      },
    ])
    .select()
    .single();

  if (metaError) {
    console.error('Supabase customization_files insert error:', metaError.message);
    throw new Error(metaError.message);
  }

  const metaPayload = {
    supabase_id: metaRow?.id,
    file_id: data.path,
    file_name: file.name,
    mime_type: file.type,
    size: file.size,
    view_link: viewLink,
    customer_name: metadata.customerName || metadata.name || '',
    email: metadata.email || '',
    phone: metadata.phone || '',
    request_id: metadata.requestId || '',
    category: metadata.category || '',
    category_name: metadata.categoryName || metadata.category || '',
    design_side: metadata.designSide || '',
    placement: metadata.placement || '',
    instructions: metadata.instructions || '',
    uploaded_at: uploadedAt,
  };

  await uploadJsonToBucket(BUCKET_NAME, metadataStoragePath(data.path), metaPayload);

  const sheetResult = await syncCustomizationRecordToSheets({
    requestId: metaPayload.request_id,
    name: metaPayload.customer_name,
    email: metaPayload.email,
    phone: metaPayload.phone,
    category: metaPayload.category,
    categoryName: metaPayload.category_name,
    designSide: metaPayload.design_side,
    placement: metaPayload.placement,
    fileName: file.name,
    uploadedAt,
    viewLink,
    instructions: metaPayload.instructions,
    storage_path: data.path,
  });

  if (!sheetResult.syncedToSheets) {
    console.warn('Customization saved to Supabase but Sheets sync failed:', sheetResult.reason);
  }

  return {
    fileId: data.path,
    viewLink,
    storagePath: data.path,
  };
}

export async function getFileFromSupabase(filePath: string) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(filePath);
    if (error) throw error;

    const { data: metadata } = await supabase
      .from('customization_files')
      .select('*')
      .eq('file_id', filePath)
      .single();

    return {
      data,
      mimeType: metadata?.mime_type || 'application/octet-stream',
      fileName: metadata?.file_name || 'file',
    };
  } catch (err) {
    console.error('Error fetching file from Supabase:', err);
    return null;
  }
}
