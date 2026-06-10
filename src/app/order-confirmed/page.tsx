'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import styles from './OrderConfirmed.module.css';

const CONFIRMATION_MESSAGE =
  'You will recieve a order confirmation mail within 48 Hours of the order place.Thank you for your understanding.';

function OrderConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      router.replace('/shop');
      return;
    }

    clearCart();

    fetch('/api/stripe-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch((err) => console.error('Order capture error:', err));
  }, [sessionId, clearCart, router]);

  if (!sessionId) {
    return null;
  }

  return (
    <main className={styles.main}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className={styles.card}
      >
        <CheckCircle size={80} className={styles.icon} aria-hidden />
        <h1 className={styles.title}>Order Confirmed</h1>
        <p className={styles.message}>{CONFIRMATION_MESSAGE}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => router.push('/')}>
            Return Home <ArrowRight size={18} />
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={() => router.push('/shop')}>
            <ShoppingBag size={18} /> Continue Shopping
          </button>
        </div>
      </motion.div>
    </main>
  );
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={null}>
      <OrderConfirmedContent />
    </Suspense>
  );
}
