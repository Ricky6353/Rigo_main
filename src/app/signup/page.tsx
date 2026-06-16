'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
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

        <div className={styles.footer}>
          <p>Already have an account? <Link href="/login">Login <ArrowRight size={14} /></Link></p>
        </div>
      </motion.div>
    </main>
  );
}
