'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronLeft, Check, Info, Play, Pause } from 'lucide-react';
import { products as initialProducts, Product } from '@/data/products';
import { useCart } from '@/components/CartProvider';
import styles from './ProductDetail.module.css';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // Redirect if id is actually a category name
  useEffect(() => {
    const categoryNames = ['tees', 'sweatshirt', 'hoodies'];
    const id = params.id as string;
    if (categoryNames.includes(id)) {
      router.replace(`/shop?category=${id}`);
    }
  }, [params.id, router]);

  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | undefined>(() => initialProducts.find((p) => p.id === params.id));
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then((data: Product[]) => {
        const found = data.find(p => p.id === params.id);
        if (found) setProduct(found);
      })
      .catch(err => console.error('Error fetching product detail:', err));
  }, [params.id]);

  if (!product) {
    return (
      <main className={styles.error}>
        <h1>Product Not Found</h1>
        <button onClick={() => router.push('/shop')}>Back to Shop</button>
      </main>
    );
  }

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
        id: `${product.id}-${selectedSize || 'OS'}`, // Unique ID for cart
        name: `${product.name} ${selectedSize ? `(${selectedSize})` : ''}`,
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
          {/* Image Gallery */}
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
                  <button 
                    onClick={togglePlay}
                    className={styles.playPauseBtn}
                  >
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
              <div className={styles.thumbnailGrid}>
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
            )}
          </motion.div>

          {/* Product Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={styles.infoSection}
          >
            <div className={styles.header}>
              <span className={styles.category}>{product.category}</span>
              <h1 className={styles.name}>{product.name}</h1>
              <p className={styles.price}>£{product.price}</p>
              {(product.soldOut || (product.sizes && product.sizes.length > 0 && product.sizes.every(s => product.soldOutSizes?.includes(s)))) && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#ffebee', border: '1px solid #ff6b6b', borderRadius: '8px', color: '#d32f2f', fontWeight: 'bold', textAlign: 'center' }}>
                  🔴 SOLD OUT
                </div>
              )}
            </div>

            <div className={styles.description}>
              <p>{product.description}</p>
            </div>

            {/* Size Picker */}
            {product.sizes && (
              <div className={styles.sizeSection}>
                <div className={styles.sizeHeader}>
                  <label>Select Size</label>
                  <button className={styles.sizeGuide}><Info size={14} /> Size Guide</button>
                </div>
                <div className={styles.sizeGrid}>
                  {product.sizes.map((size) => {
                    const isSizeSoldOut = product.soldOutSizes?.includes(size);
                    const disabled = product.soldOut || isSizeSoldOut;
                    
                    return (
                      <button
                        key={size}
                        className={`${styles.sizeBtn} ${selectedSize === size ? styles.selectedSize : ''}`}
                        onClick={() => setSelectedSize(size)}
                        disabled={disabled}
                        style={{ 
                          opacity: disabled ? 0.5 : 1, 
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          textDecoration: isSizeSoldOut ? 'line-through' : 'none',
                          position: 'relative'
                        }}
                      >
                        {size}
                        {isSizeSoldOut && !product.soldOut && (
                          <span style={{ position: 'absolute', top: '-10px', right: '-5px', fontSize: '10px', background: '#ff6b6b', color: 'white', padding: '2px 4px', borderRadius: '4px', textDecoration: 'none' }}>
                            OUT
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={styles.actions}>
              <button 
                className={styles.addToCartBtn} 
                onClick={handleAddToCart}
                disabled={adding || product.soldOut}
                style={{ opacity: product.soldOut ? 0.5 : 1, cursor: product.soldOut ? 'not-allowed' : 'pointer' }}
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
          </motion.div>
        </div>
      </div>
    </main>
  );
}
