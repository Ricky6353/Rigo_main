require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

function clean(v) {
  if (!v) return '';
  return String(v).replace(/^["']|["']$/g, '').trim();
}

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const service = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

console.log('URL host:', url ? new URL(url).hostname : 'MISSING');
console.log('Service key:', service ? `${service.slice(0, 15)}... (len ${service.length})` : 'MISSING');
console.log('Anon key:', anon ? `${anon.slice(0, 15)}... (len ${anon.length})` : 'MISSING');

async function probe(label, key) {
  const client = createClient(url, key);
  const { error: p } = await client.from('products').select('id').limit(1);
  const { error: c } = await client.from('categories').select('id').limit(1);
  console.log(`\n${label}:`);
  console.log('  products:', p ? p.message : 'OK');
  console.log('  categories:', c ? c.message : 'OK');
}

(async () => {
  if (!url) return console.error('No URL');
  if (service) await probe('service role', service);
  if (anon) await probe('anon', anon);
  if (service && anon && service === anon) {
    console.log('\nWARNING: service role and anon key are identical — use the secret/service key for SUPABASE_SERVICE_ROLE_KEY');
  }
})();
