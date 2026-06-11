'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import type { CartItem } from '@/components/CartProvider';
import type { Product } from '@/lib/catalog';
import styles from './Cart.module.css';

function resolveProductId(item: CartItem) {
  return item.productId || item.id.replace(/-[^-]+$/, '');
}

function displayName(item: CartItem) {
  return item.name.replace(/\s\([^)]+\)\s*$/, '').trim();
}

export default function CartPage() {
  const { cartItems, removeFromCart, updateCartQuantity, updateCartSize, cartTotal } = useCart();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: Product[]) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => console.error('Error loading products for cart:', err));
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

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
          <div className={styles.itemsList}>
            <AnimatePresence mode="popLayout">
              {cartItems.map((item) => {
                const productId = resolveProductId(item);
                const product = productMap.get(productId);
                const sizes = product?.sizes?.length ? product.sizes : null;
                const soldOutSizes = product?.soldOutSizes || [];
                const productSoldOut = product?.soldOut;

                return (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.cartItem}
                  >
                    <div className={styles.itemImageWrapper}>
                      <Image src={item.image} alt={displayName(item)} fill className={styles.itemImage} />
                    </div>
                    <div className={styles.itemInfo}>
                      <h2 className={styles.itemName}>{displayName(item)}</h2>
                      <p className={styles.itemPrice}>£{item.price}</p>

                      <div className={styles.itemOptions}>
                        {sizes && (
                          <div className={styles.optionRow}>
                            <label className={styles.optionLabel} htmlFor={`size-${item.id}`}>
                              Size
                            </label>
                            <div className={styles.sizeControl}>
                              <select
                                id={`size-${item.id}`}
                                className={styles.sizeSelect}
                                value={item.size || sizes[0]}
                                disabled={productSoldOut}
                                onChange={(e) => updateCartSize(item.id, e.target.value)}
                              >
                                {sizes.map((size) => {
                                  const sizeUnavailable =
                                    productSoldOut || soldOutSizes.includes(size);
                                  return (
                                    <option key={size} value={size} disabled={sizeUnavailable}>
                                      {size}
                                      {sizeUnavailable ? ' — Sold out' : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                          </div>
                        )}

                        <div className={styles.optionRow}>
                          <span className={styles.optionLabel}>Quantity</span>
                          <div className={styles.quantityControl}>
                            <button
                              type="button"
                              className={styles.quantityBtn}
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={16} />
                            </button>
                            <span className={styles.quantityValue}>{item.quantity}</span>
                            <button
                              type="button"
                              className={styles.quantityBtn}
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className={styles.removeBtn}
                      aria-label="Remove item"
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

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
