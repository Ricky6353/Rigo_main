import styles from '../info.module.css';
import Image from 'next/image';

export default function LookbookPage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Lookbook</h1>
      <div className={styles.content}>
        <p>Explore our latest seasonal collections. Art integrated into daily wear.</p>
        
        <div className={styles.imageGrid}>
          <div className={styles.imageWrapper}>
            <Image src="/hero.png" alt="Lookbook Shot 1" fill style={{objectFit:'cover'}} />
          </div>
          <div className={styles.imageWrapper}>
            <Image src="/hoodie.png" alt="Lookbook Shot 2" fill style={{objectFit:'cover'}} />
          </div>
          <div className={styles.imageWrapper}>
            <Image src="/tee.png" alt="Lookbook Shot 3" fill style={{objectFit:'cover'}} />
          </div>
        </div>
      </div>
    </div>
  );
}
