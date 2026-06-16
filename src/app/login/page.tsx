'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import styles from './Login.module.css';

import { isAdminEmail, normalizeEmail } from '@/lib/adminConfig';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const getCallbackUrl = () => {
    if (typeof window === 'undefined') return '/';
    return new URLSearchParams(window.location.search).get('callbackUrl') || '/';
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = normalizeEmail(formData.email);

      // Verify against Supabase first (clearer errors than NextAuth alone)
      const checkRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: formData.password }),
      });
      const checkData = await checkRes.json().catch(() => ({}));

      if (!checkRes.ok) {
        const msg = checkData.hint
          ? `${checkData.error || 'Login failed'}. ${checkData.hint}`
          : checkData.error || 'Invalid email or password';
        throw new Error(msg);
      }

      const result = await signIn('credentials', {
        redirect: false,
        email,
        password: formData.password,
      });

      if (result?.error) {
        console.error('NextAuth signIn error:', result.error);
        throw new Error(
          result.error === 'CredentialsSignin'
            ? 'Session could not be created. Restart the dev server (npm run dev) and try again.'
            : `Login failed (${result.error})`
        );
      }

      login(email, checkData.user?.name || email.split('@')[0]);

      const resultCallbackUrl = getCallbackUrl();
      if (isAdminEmail(email)) {
        sessionStorage.setItem('adminAuth', 'true');
        router.push(resultCallbackUrl.startsWith('/admin') ? resultCallbackUrl : '/admin');
      } else {
        sessionStorage.removeItem('adminAuth');
        router.push(resultCallbackUrl === '/admin' ? '/' : resultCallbackUrl);
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
          <p>Sign in to access your account.</p>
        </div>



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

        <div className={styles.footer}>
          <p>Don't have an account? <Link href="/signup">Sign Up <ArrowRight size={14} /></Link></p>
        </div>
      </motion.div>
    </main>
  );
}
