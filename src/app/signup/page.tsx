'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import styles from '../login/Login.module.css'; // Re-use Login styles

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      login(data.user.email, data.user.name);
      if (data.user.role === 'admin') {
        sessionStorage.setItem('adminAuth', 'true');
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Signup failed');
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
          <h1>Create Account</h1>
          <p>Join Embroyit to track your wishlist & history.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="name"><User size={16} /> Full Name</label>
            <input
              type="text"
              id="name"
              required
              placeholder="Your Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

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
            {loading ? <Loader2 className={styles.spinner} /> : 'Create Account'}
          </button>
        </form>

        {/* 
        <div className={styles.socialDivider}>
          <span>or sign up with</span>
        </div>

        <div className={styles.socialBtns}>
          <button 
            type="button" 
            className={`${styles.socialBtn} ${styles.googleBtn}`}
            onClick={() => signIn('google')}
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" width="18" height="18" />
            Sign up with Google
          </button>
          <button 
            type="button" 
            className={`${styles.socialBtn} ${styles.appleBtn}`}
            onClick={() => signIn('apple')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
              <path d="M15.5 10.5C15.5 13 17.5 14 17.5 14C17.5 14 14.5 18 11.5 18C10 18 8.5 17 7 17C5.5 17 4 18 2.5 18C-0.5 18 -1.5 11.5 1.5 7.5C3 5 5.5 3.5 7.5 3.5C9.5 3.5 10.5 4.5 11.5 4.5C12.5 4.5 14.5 3.5 16 3.5C17 3.5 19.5 4 20.5 6C20.5 6 15.5 7 15.5 10.5ZM13.5 2C13.5 1.5 14 0.5 15 0C15 1.5 14.5 2.5 13.5 3C12.5 3.5 12 3.5 11 3.5C11 2.5 12.5 2.5 13.5 2Z" />
            </svg>
            Sign up with Apple
          </button>
        </div>
        */}

        <div className={styles.footer}>
          <p>Already have an account? <Link href="/login">Login <ArrowRight size={14} /></Link></p>
        </div>
      </motion.div>
    </main>
  );
}
