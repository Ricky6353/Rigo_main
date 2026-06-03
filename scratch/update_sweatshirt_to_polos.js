/**
 * Replaces sweatshirt category with polos in Supabase + catalog storage.
 * Run: node scratch/update_sweatshirt_to_polos.js
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function updateCatalogJson(filename, transform) {
  const { data, error } = await supabase.storage.from('catalog').download(`data/${filename}`);
  if (error || !data) return;
  const parsed = JSON.parse(await data.text());
  const updated = transform(parsed);
  const body = Buffer.from(JSON.stringify(updated, null, 2), 'utf-8');
  await supabase.storage.from('catalog').upload(`data/${filename}`, body, {
    contentType: 'application/json',
    upsert: true,
  });
}

(async () => {
  const { data: products } = await supabase.from('products').select('id, category');
  for (const p of products || []) {
    if (p.category === 'sweatshirt') {
      await supabase.from('products').update({ category: 'polos' }).eq('id', p.id);
      console.log('Updated product', p.id, '→ polos');
    }
  }

  await supabase.from('categories').upsert([{ id: 'polos', name: 'Polos' }], { onConflict: 'id' });
  await supabase.from('categories').delete().eq('id', 'sweatshirt');
  console.log('Categories: polos added, sweatshirt removed');

  await updateCatalogJson('products.json', (items) =>
    items.map((p) => (p.category === 'sweatshirt' ? { ...p, category: 'polos' } : p))
  );
  await updateCatalogJson('categories.json', (items) => {
    const filtered = items.filter((c) => c.id !== 'sweatshirt');
    if (!filtered.some((c) => c.id === 'polos')) {
      filtered.push({ id: 'polos', name: 'Polos' });
    }
    return filtered.map((c) =>
      c.id === 'sweatshirt' ? { id: 'polos', name: 'Polos' } : c
    );
  });

  console.log('Done.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
