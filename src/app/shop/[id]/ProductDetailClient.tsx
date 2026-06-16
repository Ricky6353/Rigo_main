'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronLeft, ChevronRight, Check, Info, Play, Pause } from 'lucide-react';
import type { Product } from '@/lib/catalog';
import { useCart } from '@/components/CartProvider';
import ProductReviews from '@/components/ProductReviews';
import SizeChartModal from '@/components/SizeChartModal';
import { getSizeChartForCategory } from '@/lib/sizeCharts';
import styles from './ProductDetail.module.css';
import soldOutStyles from '@/styles/SoldOut.module.css';

export default function ProductDetailClient({ product: initialProduct }: { product: Product }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(initialProduct);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailTrackRef = useRef<HTMLDivElement>(null);

  const sizeChart = getSizeChartForCategory(product.category);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const scrollThumbnails = (direction: 'left' | 'right') => {
    const track = thumbnailTrackRef.current;
    if (!track) return;
    const amount = Math.max(140, Math.floor(track.clientWidth * 0.6));
    track.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const handleAddToCart = () => {
    if (product.soldOut) {
      alert('This product is currently sold out');
      return;
    }

    if (product.sizes && (!selectedSize || product.soldOutSizes?.includes(selectedSize))) {
      alert(product.soldOutSizes?.includes(selectedSize!) ? 'This size is sold out' : 'Please select a size');
      return;
    }

    setAdding(true);
    setTimeout(() => {
      addToCart({
        id: `${product.id}-${selectedSize || 'OS'}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
        size: selectedSize || 'OS',
      });
      setAdding(false);
    }, 800);
  };

  return (
    <main className={styles.main}>
      <div className="container">
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ChevronLeft size={20} /> Back
        </button>

        <div className={styles.grid}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={styles.imageSection}
          >
            <div className={styles.mainImageWrapper}>
              {product.image.toLowerCase().match(/\.(mp4|webm|mov|quicktime)$/) ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <video
                    ref={videoRef}
                    src={product.image}
                    className={styles.mainImage}
                    autoPlay
                    loop
                    muted
                    playsInline
                    disablePictureInPicture
                    disableRemotePlayback
                    controlsList="nodownload noplaybackrate nopictureinpicture"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={togglePlay}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  <button onClick={togglePlay} className={styles.playPauseBtn}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                  </button>
                </div>
              ) : (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  priority
                  className={styles.mainImage}
                />
              )}
            </div>

            {product.images && product.images.length > 0 && (
              <div className={styles.thumbnailScroller}>
                <button
                  type="button"
                  className={styles.thumbNavBtn}
                  onClick={() => scrollThumbnails('left')}
                  aria-label="Scroll media left"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className={styles.thumbnailTrack} ref={thumbnailTrackRef}>
                  {product.images.map((img, idx) => (
                    <div
                      key={idx}
                      className={`${styles.thumbnail} ${product.image === img ? styles.activeThumb : ''}`}
                      onClick={() => setProduct({ ...product, image: img })}
                    >
                      {img.toLowerCase().match(/\.(mp4|webm|mov|quicktime)$/) ? (
                        <video src={img} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Image src={img} alt={`${product.name} ${idx}`} fill style={{ objectFit: 'cover' }} />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.thumbNavBtn}
                  onClick={() => scrollThumbnails('right')}
                  aria-label="Scroll media right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={styles.infoSection}
          >
            <div className={styles.header}>
              <span className={styles.category}>{product.category}</span>
              <h1 className={styles.name}>{product.name}</h1>
              <p className={styles.price}>£{product.price}</p>
              {(product.soldOut ||
                (product.sizes &&
                  product.sizes.length > 0 &&
                  product.sizes.every((s) => product.soldOutSizes?.includes(s)))) && (
                <div className={soldOutStyles.banner}>Sold Out</div>
              )}
            </div>

            <div className={styles.description}>
              <p>{product.description}</p>
            </div>

            {product.sizes && (
              <div className={styles.sizeSection}>
                <div className={styles.sizeHeader}>
                  <label>Select Size</label>
                  {sizeChart && (
                    <button
                      type="button"
                      className={styles.sizeGuide}
                      onClick={() => setSizeChartOpen(true)}
                    >
                      <Info size={14} /> Size Chart
                    </button>
                  )}
                </div>
                <div className={styles.sizeGrid}>
                  {product.sizes.map((size) => {
                    const isSizeSoldOut = product.soldOutSizes?.includes(size);
                    const disabled = product.soldOut || isSizeSoldOut;

                    return (
                      <button
                        key={size}
                        type="button"
                        className={`${styles.sizeBtn} ${selectedSize === size ? styles.selectedSize : ''} ${disabled ? soldOutStyles.sizeBtnSoldOut : ''}`}
                        onClick={() => setSelectedSize(size)}
                        disabled={disabled}
                        style={{ position: 'relative' }}
                      >
                        {size}
                        {isSizeSoldOut && !product.soldOut && (
                          <span className={soldOutStyles.sizeOutTag}>Out</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.addToCartBtn} ${product.soldOut ? soldOutStyles.addToCartSoldOut : ''}`}
                onClick={handleAddToCart}
                disabled={adding || product.soldOut}
              >
                {product.soldOut ? (
                  <>
                    <ShoppingBag size={20} /> Sold Out
                  </>
                ) : adding ? (
                  <Check size={20} />
                ) : (
                  <>
                    <ShoppingBag size={20} /> Add to Cart
                  </>
                )}
              </button>
            </div>

            <div className={styles.detailsList}>
              <h3>Product Details</h3>
              <ul>
                {product.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>

            <ProductReviews productId={product.id} />
          </motion.div>
        </div>
      </div>

      {sizeChart && (
        <SizeChartModal chart={sizeChart} open={sizeChartOpen} onClose={() => setSizeChartOpen(false)} />
      )}
    </main>
  );
}
