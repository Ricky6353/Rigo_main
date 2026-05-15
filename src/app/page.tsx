'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './page.module.css';

import { products } from '@/data/products';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' as const } },
};

export default function Home() {
  const latestDrops = products.slice(0, 2);

  return (
    <div className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <Image
            src="/hero.png"
            alt="Intricate embroidery background"
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

      {/* Featured Collection */}
      <section className={styles.featured}>
        <motion.div
          className="container"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
        >
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Latest Drops</h2>
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
                      alt={product.name} 
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

      {/* Concept Section */}
      <section className={styles.concept}>
        <div className={styles.conceptInner}>
          <motion.div
            className={styles.conceptText}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
          >
            <h2>More Than Clothing</h2>
            <p>
              Embroyit bridges the gap between high-end fashion and urban street culture.
              Every piece features meticulously detailed embroidery, telling stories
              through thread. Uncompromised quality, timeless silhouettes.
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
              alt="Embroidery Process"
              fill
              className={styles.conceptImage}
            />
          </motion.div>
        </div>
      </section>


    </div>
  );
}
