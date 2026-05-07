import styles from '../info.module.css';
import Image from 'next/image';

export default function ArchivePage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Archive</h1>
      <div className={styles.content}>
        <p>A history of our past drops. Every piece had a story, and some are gone forever.</p>
        <div className={styles.imageGrid}>
          <div className={styles.imageWrapper}>
             <Image src="/hoodie.png" alt="Archive Item" fill style={{objectFit:'cover'}} />
          </div>
        </div>
      </div>
    </div>
  );
}
