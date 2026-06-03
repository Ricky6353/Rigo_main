'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LogOut, ShoppingBag, ArrowRight, Mail, User, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './Profile.module.css';
import { Settings } from 'lucide-react';

import { isAdminEmail } from '@/lib/adminConfig';

interface Order {
  orderId: string;
  orderDate: string;
  total: number;
  status?: string;
  items: Array<{
    name: string;
    quantity: number;
    size?: string;
  }>;
}

export default function ProfilePage() {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user?.email) {
      fetchUserOrders();
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, user?.email]);

  const fetchUserOrders = async () => {
    try {
      const res = await fetch(`/api/orders/user?email=${encodeURIComponent(user!.email)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <main className={styles.main}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.card}
        >
          <h1>Access Denied</h1>
          <p>Please log in to view your profile.</p>
          <Link href="/login" className={styles.btn}>
            Go to Login
          </Link>
        </motion.div>
      </main>
    );
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.header}
        >
          <div className={styles.userCard}>
            <div className={styles.avatar}>{user.name?.[0]?.toUpperCase() || 'U'}</div>
            <div className={styles.userInfo}>
              <h1 className={styles.userName}>{user.name || 'User'}</h1>
              <div className={styles.userEmail}>
                <Mail size={16} />
                <span>{user.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={styles.section}
        >
          <h2 className={styles.sectionTitle}>
            <ShoppingBag size={20} />
            Order History
          </h2>
          
          {loading ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner}></div>
              <p>Fetching your orders...</p>
            </div>
          ) : orders.length > 0 ? (
            <div className={styles.ordersList}>
              {orders.map((order) => (
                <div key={order.orderId} className={styles.orderCard}>
                  <div className={styles.orderTop}>
                    <div className={styles.orderId}>
                      <Package size={16} />
                      <span>#{order.orderId}</span>
                    </div>
                    <div className={styles.orderDate}>
                      {new Date(order.orderDate).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className={styles.orderItems}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className={styles.orderItem}>
                        <span className={styles.itemName}>
                          {item.name} {item.size ? `(${item.size})` : ''}
                        </span>
                        <span className={styles.itemQty}>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.orderBottom}>
                    <span className={styles.orderStatus}>{order.status || 'Paid'}</span>
                    <span className={styles.orderTotal}>£{order.total.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.placeholderBox}>
              <p>Your order history will appear here.</p>
              <p className={styles.hint}>Start shopping to build your order history.</p>
              <Link href="/shop" className={styles.shopBtn}>
                Browse Shop <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={styles.section}
        >
          <h2 className={styles.sectionTitle}>
            <User size={20} />
            Account Settings
          </h2>
          <div className={styles.settingsBox}>
            <div className={styles.setting}>
              <span className={styles.settingLabel}>Email Address</span>
              <span className={styles.settingValue}>{user.email}</span>
            </div>
            <div className={styles.setting}>
              <span className={styles.settingLabel}>Member Since</span>
              <span className={styles.settingValue}>
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
        </motion.section>

        {isAdminEmail(user.email) && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={styles.section}
          >
            <h2 className={styles.sectionTitle}>
              <Settings size={20} />
              Admin Access
            </h2>
            <div className={styles.settingsBox}>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Portal Status</span>
                <span className={styles.settingValue}>Authorized</span>
              </div>
              <div className={styles.setting}>
                <span className={styles.settingLabel}>Management</span>
                <Link href="/admin" className={styles.settingValue} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-fg)' }}>
                  Command Center <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </motion.section>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={styles.actions}
        >
          <Link href="/shop" className={styles.btn} style={{ flex: 1 }}>
            Continue Shopping
          </Link>
          <button onClick={handleLogout} className={styles.btn} style={{ background: 'transparent', border: '1px solid var(--color-fg)' }}>
            Logout
          </button>
        </motion.div>
      </div>
    </main>
  );
}
