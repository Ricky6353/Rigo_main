'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import styles from './Login.module.css';

const ADMIN_EMAIL = 'jayembroyit@gmail.com';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login, recalledAccounts } = useAuth();
  const router = useRouter();

  const handleRecall = (email: string, name: string) => {
    setLoading(true);
    setTimeout(() => {
      login(email, name);
      router.push('/');
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        throw new Error('Invalid email or password');
      }

      // We still update local client state
      login(formData.email, formData.email.split('@')[0]);

      if (formData.email.toLowerCase() === ADMIN_EMAIL) {
        sessionStorage.setItem('adminAuth', 'true');
        router.push('/admin');
      } else {
        sessionStorage.removeItem('adminAuth');
        router.push('/');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={styles.card}
      >
        <div className={styles.header}>
          <h1>Welcome Back</h1>
          <p>Sign in to recall your curated history.</p>
        </div>

        {recalledAccounts.length > 0 && (
          <div className={styles.recallSection}>
            <p className={styles.recallLabel}>Recall Recent Account</p>
            <div className={styles.accountList}>
              {recalledAccounts.map((account) => (
                <button 
                  key={account.email} 
                  className={styles.accountItem}
                  onClick={() => handleRecall(account.email, account.name)}
                  disabled={loading}
                >
                  <div className={styles.avatar}>{account.name[0]}</div>
                  <div className={styles.accountInfo}>
                    <span className={styles.name}>{account.name}</span>
                    <span className={styles.email}>{account.email}</span>
                  </div>
                </button>
              ))}
            </div>
            <div className={styles.divider}><span>or use another email</span></div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email"><Mail size={16} /> Email Address</label>
            <input
              type="email"
              id="email"
              required
              placeholder="example@embroyit.co.uk"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password"><Lock size={16} /> Password</label>
            <input
              type="password"
              id="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <Loader2 className={styles.spinner} /> : 'Login'}
          </button>
        </form>

        {/* 
        <div className={styles.socialDivider}>
          <span>or sign in with</span>
        </div>

        <div className={styles.socialBtns}>
          <button 
            type="button" 
            className={`${styles.socialBtn} ${styles.googleBtn}`}
            onClick={() => signIn('google')}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" width="18" height="18" />
            Sign in with Google
          </button>
          <button 
            type="button" 
            className={`${styles.socialBtn} ${styles.appleBtn}`}
            onClick={() => signIn('apple')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path d="M15.5 10.5C15.5 13 17.5 14 17.5 14C17.5 14 14.5 18 11.5 18C10 18 8.5 17 7 17C5.5 17 4 18 2.5 18C-0.5 18 -1.5 11.5 1.5 7.5C3 5 5.5 3.5 7.5 3.5C9.5 3.5 10.5 4.5 11.5 4.5C12.5 4.5 14.5 3.5 16 3.5C17 3.5 19.5 4 20.5 6C20.5 6 15.5 7 15.5 10.5ZM13.5 2C13.5 1.5 14 0.5 15 0C15 1.5 14.5 2.5 13.5 3C12.5 3.5 12 3.5 11 3.5C11 2.5 12.5 2.5 13.5 2Z" />
            </svg>
            Sign in with Apple
          </button>
        </div>
        */}

        <div className={styles.footer}>
          <p>Don't have an account? <Link href="/signup">Sign Up <ArrowRight size={14} /></Link></p>
        </div>
      </motion.div>
    </main>
  );
}
