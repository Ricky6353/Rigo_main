import { getSupabaseAdmin, getSupabaseReadClient, logInvalidServiceKeyHint } from './supabase';
import { SUPABASE_BUCKETS } from './supabaseBuckets';

export type ProductReview = {
  id: number;
  productId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ReviewRow = {
  id: number;
  product_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

function mapReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    authorName: row.author_name,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at,
  };
}

function isMissingTableError(message: string) {
  return message.includes('schema cache') || message.includes('does not exist');
}

async function fetchReviewsFromStorage(productId: string): Promise<ProductReview[]> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.CATALOG).download('data/reviews.json');
  if (error || !data) return [];

  const all = JSON.parse(await data.text()) as ProductReview[];
  return all
    .filter((r) => r.productId === productId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function saveReviewsToStorage(reviews: ProductReview[]) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return false;

  const body = Buffer.from(JSON.stringify(reviews, null, 2), 'utf-8');
  const { error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.CATALOG).upload('data/reviews.json', body, {
    contentType: 'application/json',
    upsert: true,
  });
  return !error;
}

async function fetchAllReviewsFromStorage(): Promise<ProductReview[]> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin.storage.from(SUPABASE_BUCKETS.CATALOG).download('data/reviews.json');
  if (error || !data) return [];
  return JSON.parse(await data.text()) as ProductReview[];
}

export async function fetchProductReviews(productId: string): Promise<ProductReview[]> {
  const client = getSupabaseReadClient() ?? getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (!error && data) {
    return (data as ReviewRow[]).map(mapReview);
  }

  if (error && !isMissingTableError(error.message)) {
    logInvalidServiceKeyHint(error.message);
    console.error('fetchProductReviews error:', error.message);
  }

  return fetchReviewsFromStorage(productId);
}

export async function createProductReview(input: {
  productId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<{ review: ProductReview | null; error?: string }> {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { review: null, error: 'Reviews are not configured yet.' };
  }

  const { data, error } = await supabaseAdmin
    .from('product_reviews')
    .insert([
      {
        product_id: input.productId,
        author_name: input.authorName.trim(),
        rating: input.rating,
        comment: input.comment.trim(),
      },
    ])
    .select()
    .single();

  if (!error && data) {
    return { review: mapReview(data as ReviewRow) };
  }

  if (error && !isMissingTableError(error.message)) {
    console.error('createProductReview error:', error.message);
    return { review: null, error: error.message };
  }

  const all = await fetchAllReviewsFromStorage();
  const review: ProductReview = {
    id: Date.now(),
    productId: input.productId,
    authorName: input.authorName.trim(),
    rating: input.rating,
    comment: input.comment.trim(),
    createdAt: new Date().toISOString(),
  };
  all.unshift(review);

  const saved = await saveReviewsToStorage(all);
  if (!saved) return { review: null, error: 'Failed to save review to Supabase catalog storage' };
  return { review };
}
