import { NextResponse } from 'next/server';
import { createProductReview, fetchProductReviews } from '@/lib/reviews';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const reviews = await fetchProductReviews(id);
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

    return NextResponse.json({ reviews, averageRating, total: reviews.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load reviews';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const authorName = (body.authorName as string)?.trim();
    const comment = (body.comment as string)?.trim();
    const rating = Number(body.rating);

    if (!authorName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!comment) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5 stars' }, { status: 400 });
    }

    const { review, error } = await createProductReview({
      productId: id,
      authorName,
      rating,
      comment,
    });

    if (error || !review) {
      return NextResponse.json({ error: error || 'Failed to save review' }, { status: 500 });
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
