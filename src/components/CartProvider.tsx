'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { getCartClearEventName, getCartStorageKey } from '@/lib/cartStorage';

export type CartItem = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
};

function baseProductName(name: string) {
  return name.replace(/\s\([^)]+\)\s*$/, '').trim();
}

function lineIdForSize(productId: string, size: string) {
  return `${productId}-${size}`;
}

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartQuantity: (id: string, quantity: number) => void;
  updateCartSize: (id: string, size: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export default function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const { status } = useSession();
  const prevAuthStatusRef = useRef<typeof status | null>(null);

  // Load cart from localStorage on mount (guest session or same logged-in visit)
  useEffect(() => {
    const savedCart = localStorage.getItem(getCartStorageKey());
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage:', e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Clear cart when user logs in or logs out (not on initial page load)
  useEffect(() => {
    if (status === 'loading') return;

    const prev = prevAuthStatusRef.current;
    if (prev && prev !== status) {
      if (
        (prev === 'unauthenticated' && status === 'authenticated') ||
        (prev === 'authenticated' && status === 'unauthenticated')
      ) {
        setCartItems([]);
        localStorage.removeItem(getCartStorageKey());
      }
    }

    prevAuthStatusRef.current = status;
  }, [status]);

  // Sync when AuthProvider clears cart on login/logout
  useEffect(() => {
    const onClear = () => setCartItems([]);
    window.addEventListener(getCartClearEventName(), onClear);
    return () => window.removeEventListener(getCartClearEventName(), onClear);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(getCartStorageKey(), JSON.stringify(cartItems));
    }
  }, [cartItems, isInitialized]);

  const addToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const updateCartSize = (lineId: string, newSize: string) => {
    setCartItems((prev) => {
      const item = prev.find((i) => i.id === lineId);
      if (!item || item.size === newSize) return prev;

      const productId = item.productId || item.id.replace(/-[^-]+$/, '');
      const newId = lineIdForSize(productId, newSize);
      const name = baseProductName(item.name);

      const duplicate = prev.find((i) => i.id === newId);
      if (duplicate) {
        return prev
          .filter((i) => i.id !== lineId)
          .map((i) =>
            i.id === newId ? { ...i, quantity: i.quantity + item.quantity } : i
          );
      }

      return prev.map((i) =>
        i.id === lineId
          ? { ...i, id: newId, productId, name, size: newSize }
          : i
      );
    });
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(getCartStorageKey());
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartSize,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
