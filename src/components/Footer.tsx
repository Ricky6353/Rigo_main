'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

const SOCIAL = {
  instagram: 'https://www.instagram.com/embroyit_ltd?igsh=ZTNmeDJoZXZydmp4',
  tiktok: 'https://www.tiktok.com/@embroyit_ltd?is_from_webapp=1&sender_device=pc',
} as const;

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

      if (response.ok && (data.success || data.message)) {
        setStatus('success');
        setMessage(data.message || 'Thank you for subscribing to Embroyit.');
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
              <a href={SOCIAL.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              </a>
              <a href={SOCIAL.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
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