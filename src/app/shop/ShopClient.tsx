'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/lib/catalog';
import styles from './Shop.module.css';
import soldOutStyles from '@/styles/SoldOut.module.css';
import { useSearchParams } from 'next/navigation';

export default function ShopClient({ 
  initialProducts, 
  dynamicCategories 
}: { 
  initialProducts: Product[], 
  dynamicCategories: { id: string; name: string }[] 
}) {
  const [filter, setFilter] = useState('all');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState(dynamicCategories);
  const searchParams = useSearchParams();

  // Always refresh from API so Command Center edits appear on the collections grid
  useEffect(() => {
    fetch('/api/products', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: Product[]) => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch((err) => console.error('Error refreshing shop products:', err));

    fetch('/api/categories', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { id: string; name: string }[]) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch((err) => console.error('Error refreshing categories:', err));
  }, []);

  // Combine 'all' with dynamic categories
  const categoriesList = ['all', ...categories.map((c) => c.id)];

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat && categoriesList.includes(cat)) {
      setFilter(cat);
    }
  }, [searchParams, categoriesList]);

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter((p) => p.category === filter);

  return (
    <main className={styles.main}>
      <header className={styles.shopHeader}>
        <div className="container">
          <h1 className={styles.title}>All Collections</h1>
          <div className={styles.filters}>
            {categoriesList.map((catId) => {
              const catName = catId === 'all' 
                ? 'all' 
                : categories.find((c) => c.id === catId)?.name || catId;
              
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
                      className={`${styles.productCard} ${isSoldOut ? soldOutStyles.cardDimmed : ''}`}
                    >
                      <Link href={`/shop/${product.id}`}>
                        <div className={styles.imageWrapper}>
                          {product.image.toLowerCase().match(/\.(mp4|webm|mov|quicktime)$/) ? (
                            <video 
                              src={product.image} 
                              className={styles.image} 
                              muted 
                              loop 
                              autoPlay 
                              playsInline 
                              disablePictureInPicture
                              disableRemotePlayback
                              onContextMenu={(e) => e.preventDefault()}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className={styles.image}
                            />
                          )}
                          <div className={`${styles.overlay} ${isSoldOut ? soldOutStyles.overlaySoldOut : ''}`}>
                            <span>{isSoldOut ? 'Sold Out' : 'Quick View'}</span>
                          </div>
                          {isSoldOut && (
                            <span className={soldOutStyles.badge}>Sold Out</span>
                          )}
                        </div>
                        <div className={styles.info}>
                          <h2 className={`${styles.productName} ${isSoldOut ? soldOutStyles.priceMuted : ''}`}>{product.name}</h2>
                          <p className={styles.productPrice}>£{product.price}</p>
                          {isSoldOut && <p className={soldOutStyles.caption}>Unavailable</p>}
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
