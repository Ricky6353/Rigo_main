'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import styles from './Cart.module.css';

export default function CartPage() {
  const { cartItems, removeFromCart, cartTotal } = useCart();

  if (cartItems.length === 0) {
    return (
      <main className={styles.empty}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.emptyContent}
        >
          <ShoppingBag size={64} className={styles.emptyIcon} />
          <h1>Your cart is currently empty.</h1>
          <p>Explore our premium collections to get started.</p>
          <Link href="/shop" className="btn btn-outline">
            Shop Now
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className="container">
        <h1 className={styles.title}>Your Shopping Cart</h1>

        <div className={styles.cartGrid}>
          {/* Items List */}
          <div className={styles.itemsList}>
            <AnimatePresence mode="popLayout">
              {cartItems.map((item) => (
                <motion.div 
                  layout
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={styles.cartItem}
                >
                  <div className={styles.itemImageWrapper}>
                    <Image src={item.image} alt={item.name} fill className={styles.itemImage} />
                  </div>
                  <div className={styles.itemInfo}>
                    <h2 className={styles.itemName}>{item.name}</h2>
                    <p className={styles.itemPrice}>£{item.price}</p>
                    <div className={styles.itemDetails}>
                      <span>Quantity: {item.quantity}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className={styles.removeBtn}
                    aria-label="Remove item"
                  >
                    <Trash2 size={20} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className={styles.summarySection}>
            <div className={styles.summaryCard}>
              <h2>Order Summary</h2>
              <div className={styles.summaryLine}>
                <span>Subtotal</span>
                <span>£{cartTotal}</span>
              </div>
              <div className={styles.summaryLine}>
                <span>Shipping</span>
                <span>Calculated at next step</span>
              </div>
              <div className={`${styles.summaryLine} ${styles.total}`}>
                <span>Total</span>
                <span>£{cartTotal}</span>
              </div>
              <Link href="/checkout" className={styles.checkoutBtn}>
                Checkout <ArrowRight size={20} />
              </Link>
              <p className={styles.paymentInfo}>
                Secure payment via Stripe. All major cards accepted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
