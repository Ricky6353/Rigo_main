'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import styles from './ProductReviews.module.css';

type Review = {
  id: number;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ProductReviewsProps = {
  productId: string;
};

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 18,
}: {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      className={`${styles.stars} ${readOnly ? styles.starsReadOnly : ''}`}
      onMouseLeave={() => !readOnly && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            className={styles.starBtn}
            disabled={readOnly}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onClick={() => onChange?.(star)}
          >
            <Star size={size} fill={filled ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`);
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 0);
      }
    } catch {
      setError('Could not load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!authorName.trim() || !comment.trim() || rating < 1) {
      setError('Please add your name, rating, and comment.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName, rating, comment }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviews((prev) => [data.review, ...prev]);
      const newTotal = reviews.length + 1;
      const newAverage =
        (reviews.reduce((sum, r) => sum + r.rating, 0) + data.review.rating) / newTotal;
      setAverageRating(newAverage);
      setAuthorName('');
      setRating(0);
      setComment('');
      setSuccess('Thank you! Your review has been posted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h3>Customer Reviews</h3>
        {reviews.length > 0 && (
          <div className={styles.summary}>
            <StarRating value={Math.round(averageRating)} readOnly size={16} />
            <span>
              {averageRating.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.formIntro}>Share your experience with this product.</p>

        <div className={styles.field}>
          <label htmlFor="review-name">Your Name</label>
          <input
            id="review-name"
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Enter your name"
            disabled={submitting}
          />
        </div>

        <div className={styles.field}>
          <label>Your Rating</label>
          <StarRating value={rating} onChange={setRating} size={22} />
        </div>

        <div className={styles.field}>
          <label htmlFor="review-comment">Your Review</label>
          <textarea
            id="review-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell others what you think..."
            disabled={submitting}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Post Review'}
        </button>
      </form>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.empty}>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className={styles.empty}>No reviews yet. Be the first to review this product.</p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewTop}>
                <div>
                  <p className={styles.author}>{review.authorName}</p>
                  <p className={styles.date}>{formatDate(review.createdAt)}</p>
                </div>
                <StarRating value={review.rating} readOnly size={14} />
              </div>
              <p className={styles.comment}>{review.comment}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
