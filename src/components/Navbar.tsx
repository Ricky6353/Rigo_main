'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Menu, X, User } from 'lucide-react';
import styles from './Navbar.module.css';
import { useCart } from './CartProvider';
import { useAuth } from './AuthProvider';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navLinks = [
    { name: 'Shop', path: '/shop' },
    { name: 'Lookbook', path: '/lookbook' },
    { name: 'Archive', path: '/archive' },
    { name: 'Shipping', path: '/shipping' },
    { name: 'Customization', path: '/customization' },
  ];

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        {/* Mobile Menu Button */}
        <button className={styles.menuBtn} onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? <X size={24} color="#f5f5f0" /> : <Menu size={24} color="#f5f5f0" />}
        </button>

        {/* Logo */}
        <Link href="/" className={styles.logo}>
          Embroyit
        </Link>

        {/* Desktop Nav */}
        <nav className={`${styles.nav} ${isMenuOpen ? styles.navOpen : ''}`}>
          <ul className={styles.navList}>
            {navLinks.map((link) => (
              <li key={link.name} className={styles.navItem}>
                <Link href={link.path} className={styles.navLink} onClick={() => setIsMenuOpen(false)}>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Profile & Cart */}
        <div className={styles.rightSection}>
          <Link href={isAuthenticated ? '/profile' : '/login'} className={styles.iconBtn} aria-label="Profile">
            <User size={22} color="#f5f5f0" />
            {isAuthenticated && <span className={styles.onlineDot} />}
          </Link>
          <Link href="/cart" className={styles.iconBtn} aria-label="Cart">
            <ShoppingBag size={22} color="#f5f5f0" />
            {cartCount > 0 && (
              <span className={styles.cartCount}>{cartCount}</span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
