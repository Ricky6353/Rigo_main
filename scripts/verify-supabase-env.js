/**
 * Check Supabase env vars (local or CI). Run: node scripts/verify-supabase-env.js
 */
require('dotenv').config({ path: '.env.local' });

function clean(value) {
  if (!value) return '';
  return String(value).replace(/^["']|["']$/g, '').trim();
}

function resolve() {
  const url =
    clean(process.env.NEXT_PUBLIC_SUPABASE_URL) || clean(process.env.SUPABASE_URL);
  const anon =
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    clean(process.env.SUPABASE_ANON_KEY);
  const service =
    clean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    clean(process.env.SUPABASE_SERVICE_KEY) ||
    clean(process.env.SUPABASE_SECRET_KEY);
  return { url, anon, service };
}

const { url, anon, service } = resolve();
const missing = [];
if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!anon) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!service) missing.push('SUPABASE_SERVICE_ROLE_KEY');

if (missing.length) {
  console.error('Supabase env check FAILED. Missing:', missing.join(', '));
  console.error('Local: copy .env.example → .env.local');
  console.error('Vercel: Project → Settings → Environment Variables → Redeploy');
  process.exit(1);
}

console.log('Supabase env check OK (URL + anon + service role set).');
process.exit(0);
