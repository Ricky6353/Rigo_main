'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|quicktime)(\?|$)/i.test(url);
}

function buildMediaList(product: Product) {
  const combined = [product.image, ...(product.images || [])].filter(Boolean);
  return [...new Set(combined)];
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [mediaIndex, setMediaIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailTrackRef = useRef<HTMLDivElement>(null);

  const allMedia = useMemo(() => buildMediaList(product), [product]);
  const currentMedia = allMedia[mediaIndex] || product.image;
  const hasMultipleMedia = allMedia.length > 1;
  const sizeChart = getSizeChartForCategory(product.category);

  useEffect(() => {
    setMediaIndex(0);
  }, [product.id]);

  useEffect(() => {
    if (mediaIndex >= allMedia.length) {
      setMediaIndex(0);
    }
  }, [allMedia.length, mediaIndex]);

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

  const goToMedia = (index: number) => {
    if (!allMedia.length) return;
    const next = ((index % allMedia.length) + allMedia.length) % allMedia.length;
    setMediaIndex(next);
    setIsPlaying(true);
  };

  const shiftMedia = (direction: 'prev' | 'next') => {
    goToMedia(direction === 'prev' ? mediaIndex - 1 : mediaIndex + 1);
  };

  const scrollThumbnails = (direction: 'left' | 'right') => {
    const track = thumbnailTrackRef.current;
    if (!track) return;
    const amount = 94;
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
        image: currentMedia,
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
              {isVideoUrl(currentMedia) ? (
                <div className={styles.mainVideoWrap}>
                  <video
                    key={currentMedia}
                    ref={videoRef}
                    src={currentMedia}
                    className={styles.mainImage}
                    autoPlay
                    loop
                    muted
                    playsInline
                    disablePictureInPicture
                    disableRemotePlayback
                    controlsList="nodownload noplaybackrate nopictureinpicture"
                    onClick={togglePlay}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  <button type="button" onClick={togglePlay} className={styles.playPauseBtn}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                  </button>
                </div>
              ) : (
                <Image
                  key={currentMedia}
                  src={currentMedia}
                  alt={product.name}
                  fill
                  priority
                  className={styles.mainImage}
                />
              )}

              {hasMultipleMedia && (
                <>
                  <button
                    type="button"
                    className={`${styles.mainNavBtn} ${styles.mainNavBtnLeft}`}
                    onClick={() => shiftMedia('prev')}
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.mainNavBtn} ${styles.mainNavBtnRight}`}
                    onClick={() => shiftMedia('next')}
                    aria-label="Next image"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className={styles.mediaCounter}>
                    {mediaIndex + 1} / {allMedia.length}
                  </div>
                </>
              )}
            </div>

            {hasMultipleMedia && (
              <div className={styles.thumbnailScroller}>
                <button
                  type="button"
                  className={styles.thumbNavBtn}
                  onClick={() => scrollThumbnails('left')}
                  aria-label="Scroll thumbnails left"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className={styles.thumbnailTrack} ref={thumbnailTrackRef}>
                  {allMedia.map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      className={`${styles.thumbnail} ${mediaIndex === idx ? styles.activeThumb : ''}`}
                      onClick={() => goToMedia(idx)}
                      aria-label={`View media ${idx + 1}`}
                    >
                      {isVideoUrl(img) ? (
                        <video src={img} muted playsInline />
                      ) : (
                        <Image src={img} alt={`${product.name} ${idx + 1}`} fill style={{ objectFit: 'cover' }} />
                      )}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className={styles.thumbNavBtn}
                  onClick={() => scrollThumbnails('right')}
                  aria-label="Scroll thumbnails right"
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
