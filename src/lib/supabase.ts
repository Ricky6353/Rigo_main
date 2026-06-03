import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined) {
  if (!value) return '';
  return value.replace(/^["']|["']$/g, '').trim();
}

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing in environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

let cachedAdmin: SupabaseClient | null = null;

/** Lazy-init so API routes always read fresh env vars (fixes "invalid creds" when client was null at import). */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;

  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !serviceKey) {
    console.warn('[Supabase] Admin client unavailable — set SUPABASE_SERVICE_ROLE_KEY in .env.local');
    return null;
  }

  cachedAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

/** @deprecated Prefer getSupabaseAdmin() */
export const supabaseAdmin = null;
