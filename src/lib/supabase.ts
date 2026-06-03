import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined) {
  if (!value) return '';
  return value.replace(/^["']|["']$/g, '').replace(/\s+/g, '').trim();
}

export function isInvalidApiKeyError(message: string) {
  return /invalid api key/i.test(message);
}

/** Resolve Supabase URL (Vercel integration may use SUPABASE_URL). */
export function getSupabaseUrl(): string {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    cleanEnv(process.env.SUPABASE_URL) ||
    ''
  );
}

/** Resolve anon/publishable key for browser + public reads. */
export function getSupabaseAnonKey(): string {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    cleanEnv(process.env.SUPABASE_ANON_KEY) ||
    cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    ''
  );
}

/** Resolve service role / secret key (server-only; never NEXT_PUBLIC_). */
export function getSupabaseServiceRoleKey(): string {
  return (
    cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    cleanEnv(process.env.SUPABASE_SERVICE_KEY) ||
    cleanEnv(process.env.SUPABASE_SECRET_KEY) ||
    ''
  );
}

export function getMissingSupabaseEnvVars(): string[] {
  const missing: string[] = [];
  if (!getSupabaseUrl()) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!getSupabaseAnonKey()) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!getSupabaseServiceRoleKey()) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  return missing;
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseServiceRoleKey());
}

/** Where to set env vars (Vercel vs local). */
export function getSupabaseSetupHint(): string {
  const missing = getMissingSupabaseEnvVars();
  if (!missing.length) return '';
  const where = process.env.VERCEL
    ? 'Vercel → Project → Settings → Environment Variables (enable Production + Preview), then Redeploy'
    : '.env.local in the project root';
  return `Missing: ${missing.join(', ')}. Add them in ${where}.`;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Public credentials missing:', getSupabaseSetupHint() || 'check env vars');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

let cachedRead: SupabaseClient | null = null;

/** Anon/publishable client for public SELECT (products, categories, reviews). */
export function getSupabaseReadClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) return null;

  if (!cachedRead) {
    cachedRead = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedRead;
}

let cachedAdmin: SupabaseClient | null = null;

/** Lazy-init so API routes read env at request time (not stale import). */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;

  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) {
    console.warn('[Supabase] Admin client unavailable —', getSupabaseSetupHint());
    return null;
  }

  const anonKey = getSupabaseAnonKey();
  if (anonKey && serviceKey === anonKey) {
    console.error(
      '[Supabase] SUPABASE_SERVICE_ROLE_KEY must be the secret key (sb_secret_...), not the publishable/anon key.'
    );
    return null;
  }

  cachedAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}

export function logInvalidServiceKeyHint(errorMessage: string) {
  if (!isInvalidApiKeyError(errorMessage)) return;
  console.error(
    '[Supabase] Invalid API key for SUPABASE_SERVICE_ROLE_KEY. In Vercel, set it to the secret key from Supabase → Project Settings → API (sb_secret_...), matching NEXT_PUBLIC_SUPABASE_URL. Public shop reads use the publishable key instead.'
  );
}

/** @deprecated Prefer getSupabaseAdmin() */
export const supabaseAdmin = null;
