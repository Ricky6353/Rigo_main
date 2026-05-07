import styles from '../info.module.css';

export default function ShippingPage() {
  return (
    <div className={`container ${styles.page}`}>
      <h1 className={styles.title}>Shipping & Returns</h1>
      <div className={styles.content}>
        <h2>Domestic Shipping</h2>
        <p>All domestic orders are shipped via standard carrier and typically arrive within 3-5 business days. Express shipping is available at checkout.</p>
        
        <h2>International Shipping</h2>
        <p>We ship worldwide. International orders typically arrive within 7-14 business days. Customs duties and taxes are the responsibility of the customer.</p>
        
        <h2>Returns</h2>
        <p>Returns are accepted within 14 days of delivery. Items must be unworn, unwashed, and in their original packaging. Please contact our support team to initiate a return.</p>
      </div>
    </div>
  );
}
