'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ShieldCheck, Lock } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import styles from './Checkout.module.css';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartItems, cartTotal } = useCart();
  const [status, setStatus] = useState<'idle' | 'processing'>('idle');
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');

  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      alert('Payment was cancelled. Your cart is still saved.');
      router.replace('/checkout');
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');
    
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          origin: window.location.origin,
          email: shippingInfo.email,
          shipping: shippingInfo
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to real Stripe page
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error(err);
      alert('Payment failed to initialize. Please check your connection.');
      setStatus('idle');
    }
  };

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
                <input 
                  type="text" 
                  placeholder="First Name" 
                  required 
                  value={shippingInfo.firstName}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  required 
                  value={shippingInfo.lastName}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
                />
              </div>
              <input 
                type="email" 
                placeholder="Email Address" 
                required 
                value={shippingInfo.email}
                onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
              />
              <input 
                type="text" 
                placeholder="Address" 
                required 
                value={shippingInfo.address}
                onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
              />
              <div className={styles.inputRow}>
                <input 
                  type="text" 
                  placeholder="City" 
                  required 
                  value={shippingInfo.city}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                />
                <input 
                  type="text" 
                  placeholder="Postal Code" 
                  required 
                  value={shippingInfo.postalCode}
                  onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                />
              </div>
            </section>

            <section className={styles.section}>
              <h2>2. Payment & Security</h2>
              <div className={styles.stripeInfoBox}>
                <div className={styles.stripeHeader}>
                  <CreditCard size={20} /> <span>Credit Card & Digital Wallets</span>
                </div>
                <p className={styles.stripeNotice}>
                  Payments are securely processed through **Stripe**. You will be redirected to an industry-standard encrypted and PCI-compliant gateway to finalize your order. Your sensitive payment details are never stored on our servers, ensuring maximum privacy and security.
                </p>
                <div className={styles.trustBadges}>
                  <div className={styles.badgeItem}>
                    <ShieldCheck size={14} /> <span>PCI-DSS Compliant</span>
                  </div>
                  <div className={styles.badgeItem}>
                    <Lock size={14} /> <span>256-Bit SSL Encryption</span>
                  </div>
                </div>
              </div>
            </section>

            <button type="submit" className={styles.submitBtn} disabled={status === 'processing'}>
              {status === 'processing' ? (
                'Preparing Secure Checkout...'
              ) : (
                `Proceed to Payment • £${cartTotal}`
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
                You will receive an order confirmation email within 48 hours of placing your order.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
