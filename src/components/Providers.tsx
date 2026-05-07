'use client';

import { SessionProvider } from 'next-auth/react';
import AuthProvider from '@/components/AuthProvider';
import CartProvider from '@/components/CartProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
