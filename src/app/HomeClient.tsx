'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './page.module.css';
import type { Product } from '@/lib/catalog';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' as const } },
};

export default function HomeClient() {
  const [latestDrops, setLatestDrops] = useState<Product[]>([]);

  useEffect(() => {
    fetch('/api/products', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: Product[]) => {
        if (Array.isArray(data)) setLatestDrops(data.slice(0, 2));
      })
      .catch((err) => console.error('Error loading products:', err));
  }, []);

  return (
    <div className={styles.main}>
      <section className={styles.hero} aria-label="Embroyit custom embroidery UK">
        <div className={styles.heroBackground}>
          <Image
            src="/hero.png"
            alt="Premium custom embroidery and embroidered streetwear UK — Embroyit"
            fill
            priority
            style={{ objectFit: 'cover' }}
          />
          <div className={styles.overlay} />
        </div>

        <div className={styles.heroContent}>
          <motion.h1
            className={styles.heroTitle}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            Embroyit
          </motion.h1>
          <motion.p
            className={styles.heroSubtitle}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.2 }}
          >
            Art in every stitch.
          </motion.p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.4 }}
          >
            <Link href="/shop" className="btn btn-outline">
              Shop Collection
            </Link>
          </motion.div>
        </div>
      </section>

      <section className={styles.featured} aria-labelledby="latest-drops-heading">
        <motion.div
          className="container"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
        >
          <div className={styles.sectionHeader}>
            <h2 id="latest-drops-heading" className={styles.sectionTitle}>
              Latest Drops
            </h2>
            <Link href="/shop" className={styles.viewAllBtn}>
              View All
            </Link>
          </div>

          <div className={styles.productGrid}>
            {latestDrops.map((product) => (
              <Link href={`/shop/${product.id}`} key={product.id} className={styles.productCard}>
                <div className={styles.productImageWrapper}>
                  {product.image.toLowerCase().match(/\.(mp4|webm|mov|quicktime)$/) ? (
                    <video
                      src={product.image}
                      className={styles.productImage}
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
                      alt={`${product.name} — embroidered ${product.category} UK`}
                      fill
                      className={styles.productImage}
                    />
                  )}
                </div>
                <div className={styles.productInfo}>
                  <h3 className={styles.productName}>{product.name}</h3>
                  <p className={styles.productPrice}>£{product.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </section>

      <section className={styles.concept} aria-labelledby="embroidery-story-heading">
        <div className={styles.conceptInner}>
          <motion.div
            className={styles.conceptText}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
          >
            <h2 id="embroidery-story-heading">More Than Clothing</h2>
            <p>
              Embroyit bridges the gap between high-end fashion and urban street culture in the UK.
              Every piece features meticulously detailed custom embroidery, telling stories
              through thread. Shop embroidered hoodies, tees, polos and upload your own design.
            </p>
            <Link href="/lookbook" className="btn">
              Explore Lookbook
            </Link>
          </motion.div>
          <motion.div
            className={styles.conceptImageWrapper}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <Image
              src="/hero.png"
              alt="Custom embroidery process — Embroyit UK"
              fill
              className={styles.conceptImage}
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
}
