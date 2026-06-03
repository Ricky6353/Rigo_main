/**
 * Check Supabase env vars and API keys. Run: node scripts/verify-supabase-env.js
 * Uses REST fetch (no WebSocket) so it works on Node 20 without the "ws" package.
 */
require('dotenv').config({ path: '.env.local' });

function clean(value) {
  if (!value) return '';
  return String(value).replace(/^["']|["']$/g, '').replace(/\s+/g, '').trim();
}

const url = (clean(process.env.NEXT_PUBLIC_SUPABASE_URL) || clean(process.env.SUPABASE_URL)).replace(
  /\/$/,
  ''
);
const anon =
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || clean(process.env.SUPABASE_ANON_KEY);
const service =
  clean(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
  clean(process.env.SUPABASE_SERVICE_KEY) ||
  clean(process.env.SUPABASE_SECRET_KEY);

const missing = [];
if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!anon) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!service) missing.push('SUPABASE_SERVICE_ROLE_KEY');

if (missing.length) {
  console.error('Supabase env check FAILED. Missing:', missing.join(', '));
  process.exit(1);
}

if (service === anon) {
  console.error(
    'Supabase env check FAILED: SUPABASE_SERVICE_ROLE_KEY must be the SECRET key (sb_secret_...), not the publishable/anon key.'
  );
  process.exit(1);
}

async function probe(label, key) {
  const endpoint = `${url}/rest/v1/products?select=id&limit=1`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      detail = res.statusText;
    }
    console.error(`${label} API check FAILED (${res.status}):`, detail.slice(0, 300));
    return false;
  }

  console.log(`${label} API check OK`);
  return true;
}

(async () => {
  try {
    const anonOk = await probe('Publishable/anon', anon);
    const serviceOk = await probe('Service/secret', service);
    if (!anonOk) {
      console.error(
        'Fix NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable key from Supabase → Project Settings → API).'
      );
      process.exit(1);
    }
    if (!serviceOk) {
      console.error(
        'Fix SUPABASE_SERVICE_ROLE_KEY (secret key sb_secret_..., same project as NEXT_PUBLIC_SUPABASE_URL).'
      );
      process.exit(1);
    }
    console.log('Supabase env check OK.');
  } catch (err) {
    console.error('Supabase env check FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
