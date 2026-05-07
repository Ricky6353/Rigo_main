'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, ArrowRight, CornerUpLeft } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import styles from './Checkout.module.css';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartTotal, clearCart } = useCart();
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  // const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    
    // Mock Payment Processing
    setTimeout(() => {
      setStatus('success');
      clearCart();
    }, 2500);
  };

  if (status === 'success') {
    return (
      <main className={styles.successWrapper}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={styles.successCard}
        >
          <CheckCircle size={80} className={styles.successIcon} />
          <h1>Order Confirmed</h1>
          <p>Thank you for shopping with Embroyit. Your order is being processed.</p>
          <button onClick={() => router.push('/')} className={styles.homeBtn}>
            Return Home <ArrowRight size={20} />
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className="container">
        <h1 className={styles.title}>Secure Checkout</h1>

        <div className={styles.grid}>
          {/* Checkout Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            <section className={styles.section}>
              <h2>1. Shipping Details</h2>
              <div className={styles.inputRow}>
                <input type="text" placeholder="First Name" required />
                <input type="text" placeholder="Last Name" required />
              </div>
              <input type="email" placeholder="Email Address" required />
              <input type="text" placeholder="Address" required />
              <div className={styles.inputRow}>
                <input type="text" placeholder="City" required />
                <input type="text" placeholder="Postal Code" required />
              </div>
            </section>

            <section className={styles.section}>
              <h2>2. Payment Information</h2>
              <div className={styles.paymentSelector}>
                <button 
                  type="button"
                  className={`${styles.methodBtn} ${paymentMethod === 'card' ? styles.activeMethod : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard size={18} /> Card
                </button>
                {/* 
                <button 
                  type="button"
                  className={`${styles.methodBtn} ${paymentMethod === 'paypal' ? styles.activeMethod : ''}`}
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <span>PayPal</span>
                </button>
                */}
              </div>

              {paymentMethod === 'card' ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.paymentBox}
                >
                  <div className={styles.paymentHeader}>
                    <CreditCard size={20} /> <span>Credit Card</span>
                  </div>
                  <input type="text" placeholder="Card Number" required />
                  <div className={styles.inputRow}>
                    <input type="text" placeholder="MM/YY" required />
                    <input type="text" placeholder="CVC" required />
                  </div>
                </motion.div>
              ) : (
                /*
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.paypalBox}
                >
                  <div className={styles.paypalLogo}>
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="#003087">
                      <path d="M20.067 8.178c-.552 2.766-2.52 4.149-5.903 4.149h-1.638c-.377 0-.712.261-.75.631l-.9 8.788c-.015.15-.141.261-.295.261h-3.413c-.15 0-.27-.112-.259-.261l.9-8.788c.038-.37.373-.631.75-.631h.75l.135-1.313a.262.262 0 0 1 .259-.236h1.226c2.723 0 4.316-1.121 4.778-3.344.202-.975.143-1.74-.176-2.295-.443-.765-1.391-1.076-2.839-1.076H9.379c-.377 0-.712.261-.75.631l-1.03 10.05-2.25 1.575a.262.262 0 0 1-.41-.214L7.152 2.651c.038-.37.373-.631.75-.631h7.871c3.086 0 5.093 1.503 5.4 3.018.318 1.549-.333 3.018-1.106 3.14z"/>
                    </svg>
                  </div>
                  <p>You will be redirected to PayPal to complete your purchase securely.</p>
                </motion.div>
                */
                null
              )}
            </section>

            <button type="submit" className={styles.submitBtn} disabled={status === 'processing'}>
              {status === 'processing' ? (
                'Redirecting...'
              ) : (
                paymentMethod === 'card' ? `Pay £${cartTotal}` : `Pay £${cartTotal}` // `Continue with PayPal`
              )}
            </button>
          </form>

          {/* Summary Sidebar */}
          <aside className={styles.sidebar}>
            <div className={styles.summaryCard}>
              <h3>Order Total</h3>
              <div className={styles.summaryLine}>
                <span>Subtotal</span>
                <span>£{cartTotal}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>Shipping</span>
                <span>FREE</span>
              </div>
              <div className={`${styles.summaryLine} ${styles.total}`}>
                <span>Total</span>
                <span>£{cartTotal}</span>
              </div>
              <p className={styles.notice}>
                You will receive an order confirmation email shortly after payment.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
