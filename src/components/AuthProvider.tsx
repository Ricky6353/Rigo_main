'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';

import { isAdminEmail, normalizeEmail } from '@/lib/adminConfig';
import { clearPersistedCart } from '@/lib/cartStorage';

type User = {
  id: string;
  name: string;
  email: string;
  wishlist: string[]; 
  history: string[]; 
};

type AuthContextType = {
  user: User | null;
  login: (email: string, name: string) => void;
  logout: () => void;
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  addToHistory: (productId: string) => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const { data: session } = useSession();

  // Load user and recall history from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('embroyit_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    localStorage.removeItem('embroyit_login_history'); // Clean up any existing history
  }, []);

  // Sync NextAuth session with local user state (credentials + Google/Apple)
  useEffect(() => {
    if (session?.user?.email) {
      setUser((prev) => ({
        id: session.user.id || session.user.email || '',
        name: session.user.name || prev?.name || '',
        email: session.user.email || '',
        wishlist: prev?.wishlist || [],
        history: prev?.history || [],
      }));

      if (isAdminEmail(normalizeEmail(session.user.email))) {
        sessionStorage.setItem('adminAuth', 'true');
      } else {
        sessionStorage.removeItem('adminAuth');
      }
    }
  }, [session]);

  // Save changes to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem('embroyit_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('embroyit_user');
    }
  }, [user]);

  const login = (email: string, name: string) => {
    clearPersistedCart();
    const mockUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email,
      wishlist: [],
      history: [],
    };
    setUser(mockUser);
  };

  const logout = () => {
    clearPersistedCart();
    setUser(null);
    sessionStorage.removeItem('adminAuth');
    signOut({ redirect: false });
  };

  const addToWishlist = (productId: string) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return null;
      if (prev.wishlist.includes(productId)) return prev;
      return { ...prev, wishlist: [...prev.wishlist, productId] };
    });
  };

  const removeFromWishlist = (productId: string) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, wishlist: prev.wishlist.filter((id) => id !== productId) };
    });
  };

  const addToHistory = (productId: string) => {
    if (!user) return;
    setUser((prev) => {
      if (!prev) return null;
      const newHistory = [productId, ...prev.history.filter((id) => id !== productId)].slice(0, 10);
      return { ...prev, history: newHistory };
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      addToWishlist, 
      removeFromWishlist, 
      addToHistory,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
