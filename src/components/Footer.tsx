'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Globe } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Thank you for subscribing to Embroyit.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to subscribe. Please check your connection.');
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Brand Section */}
          <div className={styles.brandSection}>
            <Link href="/" className={styles.logo}>
              Embroyit
            </Link>
            <p className={styles.description}>
              Crafting timeless elegance through contemporary design. Join our community for exclusive access to new collections and artisanal stories.
            </p>
            <form className={styles.subscribeForm} onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Enter your email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Joining...' : 'Join the Club'}
              </button>
              {status === 'success' && <p className={styles.successMsg}>{message}</p>}
              {status === 'error' && <p className={styles.errorMsg}>{message}</p>}
            </form>
          </div>

          {/* Links Section 1 */}
          <div className={styles.linksSection}>
            <h4 className={styles.heading}>Shop</h4>
            <ul className={styles.list}>
              <li><Link href="/shop">All Collections</Link></li>
              <li><Link href="/lookbook">Lookbook</Link></li>
              <li><Link href="/archive">Archive</Link></li>
              <li><Link href="/customization">Customization</Link></li>
            </ul>
          </div>

          {/* Links Section 2 */}
          <div className={styles.linksSection}>
            <h4 className={styles.heading}>Support</h4>
            <ul className={styles.list}>
              <li><Link href="/shipping">Shipping & Returns</Link></li>
            </ul>
          </div>

          {/* Social Section */}
          <div className={styles.socialSection}>
            <h4 className={styles.heading}>Connect</h4>
            <div className={styles.socialIcons}>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </a>
              <a href="mailto:contact@embroyit.com" aria-label="Email">
                <Mail size={20} />
              </a>
            </div>
            <p className={styles.supportQuery}>
              Need assistance:
              <br />
              <a href="mailto:support@embroyit.co.uk">support@embroyit.co.uk</a>
            </p>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Embroyit. All rights reserved.</p>
          <div className={styles.policyLinks}>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}