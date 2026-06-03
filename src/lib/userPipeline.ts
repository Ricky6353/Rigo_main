import { getSupabaseAdmin } from './supabase';
import { SUPABASE_BUCKETS, uploadJsonToBucket } from './supabaseBuckets';
import { syncUserRecordToSheets } from './sheetsSync';

export interface UserRecord {
  id: string | number;
  name: string;
  email: string;
  password?: string;
  role: string;
  created_at?: string;
  updated_at?: string;
  auth_type?: string;
  image?: string | null;
}

function userStoragePath(userId: string | number) {
  return `records/${userId}.json`;
}

async function saveUserJsonToBucket(user: UserRecord) {
  const storagePath = userStoragePath(user.id);
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    password: user.password,
    created_at: user.created_at,
    updated_at: user.updated_at,
    auth_type: user.auth_type,
    image: user.image,
    syncedAt: new Date().toISOString(),
  };

  return uploadJsonToBucket(SUPABASE_BUCKETS.USERS, storagePath, payload);
}

/** Persist user to Supabase DB + users bucket, then push to Google Sheets (no password in sheet). */
export async function persistAndSyncUser(user: UserRecord, options?: { skipSheetsIfDuplicate?: boolean }) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return {
      user,
      dbResult: { persistedToDb: false, reason: 'Supabase admin client not configured' },
      bucketResult: { ok: false, reason: 'Supabase admin client not configured' },
      sheetResult: { syncedToSheets: false, reason: 'Supabase not configured' },
    };
  }

  const bucketResult = await saveUserJsonToBucket(user);
  const storage_path = userStoragePath(user.id);

  let sheetResult = { syncedToSheets: false, reason: 'Skipped' };
  if (!options?.skipSheetsIfDuplicate) {
    sheetResult = await syncUserRecordToSheets({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      storage_path,
    });
  }

  return {
    user,
    dbResult: { persistedToDb: true, insertedId: user.id },
    bucketResult,
    sheetResult,
  };
}
