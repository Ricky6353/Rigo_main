'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/data/products';
import styles from './Shop.module.css';
import { useSearchParams } from 'next/navigation';

export default function ShopClient({ 
  initialProducts, 
  dynamicCategories 
}: { 
  initialProducts: Product[], 
  dynamicCategories: { id: string; name: string }[] 
}) {
  const [filter, setFilter] = useState('all');
  const searchParams = useSearchParams();

  // Combine 'all' with dynamic categories
  const categoriesList = ['all', ...dynamicCategories.map(c => c.id)];

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && categoriesList.includes(cat)) {
      setFilter(cat);
    }
  }, [searchParams, categoriesList]);

  const filteredProducts = filter === 'all' 
    ? initialProducts 
    : initialProducts.filter(p => p.category === filter);

  return (
    <main className={styles.main}>
      <header className={styles.shopHeader}>
        <div className="container">
          <h1 className={styles.title}>All Collections</h1>
          <div className={styles.filters}>
            {categoriesList.map((catId) => {
              const catName = catId === 'all' 
                ? 'all' 
                : dynamicCategories.find(c => c.id === catId)?.name || catId;
              
              return (
                <button
                  key={catId}
                  className={`${styles.filterBtn} ${filter === catId ? styles.active : ''}`}
                  onClick={() => setFilter(catId)}
                >
                  {catName}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <section className={styles.productGridSection}>
        <div className="container">
          <motion.div layout className={styles.grid}>
            <AnimatePresence mode="popLayout">
                {filteredProducts.map((product) => {
                  const allSizesSoldOut = product.sizes && product.sizes.length > 0 && 
                    product.sizes.every(size => product.soldOutSizes?.includes(size));
                  const isSoldOut = product.soldOut || allSizesSoldOut;

                  return (
                    <motion.div
                      layout
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4 }}
                      className={styles.productCard}
                    >
                      <Link href={`/shop/${product.id}`}>
                        <div className={styles.imageWrapper}>
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className={styles.image}
                          />
                          <div className={styles.overlay}>
                            <span>{isSoldOut ? 'Sold Out' : 'Quick View'}</span>
                          </div>
                          {isSoldOut && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ff6b6b', color: 'white', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.85rem', zIndex: 10 }}>
                              SOLD OUT
                            </div>
                          )}
                        </div>
                        <div className={styles.info}>
                          <h2 className={styles.productName}>{product.name}</h2>
                          <p className={styles.productPrice}>£{product.price}</p>
                          {isSoldOut && <p style={{ color: '#ff6b6b', fontSize: '0.9rem', marginTop: '5px', fontWeight: 'bold' }}>🔴 Not Available</p>}
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
