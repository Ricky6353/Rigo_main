'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getProductById } from '@/lib/data';
import { useCart } from '@/components/CartProvider';
import { notFound } from 'next/navigation';
import styles from '../product.module.css';
import Link from 'next/link';

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = getProductById(params.id);
  const { addToCart } = useCart();
  const [isAdded, setIsAdded] = useState(false);

  if (!product) {
    notFound();
  }

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
      size: 'OS'
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className={`container ${styles.productPage}`}>
      <div className={styles.productContainer}>
        <div className={styles.imageColumn}>
          <div className={styles.imageWrapper}>
            <Image 
              src={product.image} 
              alt={product.name} 
              fill 
              priority
              className={styles.image} 
            />
          </div>
        </div>
        <div className={styles.infoColumn}>
          <nav className={styles.breadcrumbs}>
            <Link href="/shop">Shop</Link> &gt; <Link href={`/shop/${product.category}`}>{product.category}</Link>
          </nav>
          
          <h1 className={styles.title}>{product.name}</h1>
          <p className={styles.price}>${product.price.toFixed(2)}</p>
          
          <div className={styles.description}>
            <p>{product.description}</p>
          </div>

          <button 
            className={`btn ${styles.addToCartBtn}`} 
            onClick={handleAddToCart}
            disabled={isAdded}
          >
            {isAdded ? 'Added to Cart' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
