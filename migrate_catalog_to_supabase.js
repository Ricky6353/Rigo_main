/**
 * Migrates local catalog data (products, categories, reviews, images) to Supabase.
 * Run: node migrate_catalog_to_supabase.js
 *
 * Before first run: execute the catalog section in supabase/schema.sql
 * (categories, products, product_reviews, gallery_items tables + products/gallery buckets)
 * in Supabase Dashboard → SQL Editor.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const PRODUCTS_JSON = path.join(process.cwd(), 'src', 'data', 'products.json');
const CATEGORIES_JSON = path.join(process.cwd(), 'src', 'data', 'categories.json');
const REVIEWS_JSON = path.join(process.cwd(), 'src', 'data', 'reviews.json');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

const STATIC_IMAGES = {
  '/hoodie.png': { file: 'hoodie.png', type: 'image/png' },
  '/tee.png': { file: 'tee.png', type: 'image/png' },
  '/hero.png': { file: 'hero.png', type: 'image/png' },
};

function mapProductToRow(product) {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    price: product.price,
    description: product.description || '',
    sizes: product.sizes || [],
    details: product.details || [],
    image: product.image,
    images: product.images || [],
    sold_out: Boolean(product.soldOut),
    sold_out_sizes: product.soldOutSizes || [],
    updated_at: new Date().toISOString(),
  };
}

async function ensureBucket(supabase, name) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === name)) {
    console.log(`  Bucket "${name}" exists`);
    return;
  }
  const { error } = await supabase.storage.createBucket(name, { public: true });
  if (error) throw new Error(`Failed to create bucket ${name}: ${error.message}`);
  console.log(`  Created bucket "${name}"`);
}

async function uploadLocalImage(supabase, localFile, storagePath, contentType) {
  const fullPath = path.join(PUBLIC_DIR, localFile);
  if (!fs.existsSync(fullPath)) return null;

  const buffer = fs.readFileSync(fullPath);
  const { data, error } = await supabase.storage.from('products').upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });
  if (error) {
    console.warn(`  Upload failed ${storagePath}:`, error.message);
    return null;
  }
  const { data: urlData } = supabase.storage.from('products').getPublicUrl(data.path);
  return urlData.publicUrl;
}

async function resolveImageUrl(supabase, imageUrl, cache) {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith('http')) return imageUrl;
  if (cache[imageUrl]) return cache[imageUrl];

  if (STATIC_IMAGES[imageUrl]) {
    const { file, type } = STATIC_IMAGES[imageUrl];
    const uploaded = await uploadLocalImage(supabase, file, `static/${file}`, type);
    if (uploaded) {
      cache[imageUrl] = uploaded;
      return uploaded;
    }
  }

  if (imageUrl.startsWith('/uploads/')) {
    const relative = imageUrl.replace(/^\//, '');
    const fullPath = path.join(PUBLIC_DIR, relative);
    if (fs.existsSync(fullPath)) {
      const storagePath = `migrated/${relative.replace(/\\/g, '/')}`;
      const ext = path.extname(fullPath).toLowerCase();
      const type =
        ext === '.png' ? 'image/png' : ext === '.mp4' ? 'video/mp4' : ext === '.webm' ? 'video/webm' : 'image/jpeg';
      const buffer = fs.readFileSync(fullPath);
      const { data, error } = await supabase.storage.from('products').upload(storagePath, buffer, {
        contentType: type,
        upsert: true,
      });
      if (!error) {
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(data.path);
        cache[imageUrl] = urlData.publicUrl;
        return urlData.publicUrl;
      }
    }
  }

  return imageUrl;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase env vars in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Checking catalog tables...');
  const { error: tableError } = await supabase.from('products').select('id').limit(1);
  const tablesReady = !tableError || (!tableError.message?.includes('schema cache') && tableError.code !== 'PGRST205');
  if (!tablesReady) {
    console.log('  Catalog DB tables not found — will use Supabase catalog storage bucket for JSON data.');
    console.log('  Tip: run supabase/catalog_migration.sql in SQL Editor, then re-run this script for DB tables.\n');
  } else {
    console.log('  Catalog DB tables found.\n');
  }

  console.log('Ensuring storage buckets...');
  await ensureBucket(supabase, 'products');
  await ensureBucket(supabase, 'gallery');
  await ensureBucket(supabase, 'catalog');

  const imageCache = {};

  console.log('\nMigrating categories...');
  const categories = JSON.parse(fs.readFileSync(CATEGORIES_JSON, 'utf-8'));
  if (tablesReady) {
    const { error: catError } = await supabase.from('categories').upsert(categories, { onConflict: 'id' });
    if (catError) throw new Error(`Categories: ${catError.message}`);
  }
  const catBody = Buffer.from(JSON.stringify(categories, null, 2), 'utf-8');
  await supabase.storage.from('catalog').upload('data/categories.json', catBody, {
    contentType: 'application/json',
    upsert: true,
  });
  console.log(`  ${categories.length} categories`);

  console.log('\nMigrating products + images...');
  const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf-8'));
  for (const product of products) {
    product.image = await resolveImageUrl(supabase, product.image, imageCache);
    if (product.images?.length) {
      product.images = await Promise.all(
        product.images.map((img) => resolveImageUrl(supabase, img, imageCache))
      );
    }
    if (tablesReady) {
      const row = mapProductToRow(product);
      const { error } = await supabase.from('products').upsert([row], { onConflict: 'id' });
      if (error) throw new Error(`Product ${product.id}: ${error.message}`);
    }
    console.log(`  ${product.id} → ${product.image}`);
  }

  const productsBody = Buffer.from(JSON.stringify(products, null, 2), 'utf-8');
  await supabase.storage.from('catalog').upload('data/products.json', productsBody, {
    contentType: 'application/json',
    upsert: true,
  });

  console.log('\nMigrating reviews...');
  if (fs.existsSync(REVIEWS_JSON)) {
    const reviews = JSON.parse(fs.readFileSync(REVIEWS_JSON, 'utf-8'));
    for (const review of reviews) {
      if (tablesReady) {
        const { error } = await supabase.from('product_reviews').insert([
          {
            product_id: review.productId,
            author_name: review.authorName,
            rating: review.rating,
            comment: review.comment,
            created_at: review.createdAt,
          },
        ]);
        if (error && !error.message.includes('duplicate')) {
          console.warn(`  Review DB skip: ${error.message}`);
        }
      }
      console.log(`  Review by ${review.authorName} on ${review.productId}`);
    }
    const reviewsBody = Buffer.from(JSON.stringify(reviews, null, 2), 'utf-8');
    await supabase.storage.from('catalog').upload('data/reviews.json', reviewsBody, {
      contentType: 'application/json',
      upsert: true,
    });
  }

  console.log('\nMigrating gallery uploads from public/uploads/gallery...');
  const galleryDir = path.join(PUBLIC_DIR, 'uploads', 'gallery');
  if (fs.existsSync(galleryDir)) {
    const files = fs.readdirSync(galleryDir);
    for (const file of files) {
      const fullPath = path.join(galleryDir, file);
      if (!fs.statSync(fullPath).isFile()) continue;
      const buffer = fs.readFileSync(fullPath);
      const storagePath = `migrated/${file}`;
      const ext = path.extname(file).toLowerCase();
      const type =
        ext === '.png' ? 'image/png' : ext === '.mp4' ? 'video/mp4' : ext === '.webm' ? 'video/webm' : 'image/jpeg';
      const { data, error } = await supabase.storage.from('gallery').upload(storagePath, buffer, {
        contentType: type,
        upsert: true,
      });
      if (error) {
        console.warn(`  Gallery ${file}: ${error.message}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from('gallery').getPublicUrl(data.path);
      if (tablesReady) {
        await supabase.from('gallery_items').insert([
          {
            url: urlData.publicUrl,
            storage_path: data.path,
            mime_type: type,
          },
        ]);
      }
      console.log(`  ${file}`);
    }
  } else {
    console.log('  (no local gallery folder)');
  }

  console.log('\nDone. Catalog data is now in Supabase.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
