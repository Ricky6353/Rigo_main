import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { resolveRole } from '@/lib/adminConfig';

export default withAuth(
  function proxy(request) {
    const { pathname } = request.nextUrl;
    
    // Define categories to redirect
    const categories = ['tees', 'polos', 'hoodies'];
    
    // Check if pathname matches /shop/[category]
    const shopMatch = pathname.match(/^\/shop\/([^/]+)$/);
    
    if (shopMatch) {
      const slug = shopMatch[1] === 'sweatshirt' ? 'polos' : shopMatch[1];
      if (categories.includes(slug) || shopMatch[1] === 'sweatshirt') {
        const url = request.nextUrl.clone();
        url.pathname = '/shop';
        url.searchParams.set('category', slug);
        return NextResponse.redirect(url);
      }
    }

    // Admin portal and API protection
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      const email = request.nextauth.token?.email as string | undefined;
      const role = request.nextauth.token?.role as string | undefined;
      const isAdmin = email && resolveRole(email, role) === 'admin';

      if (!isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      // Allow the proxy function to run and handle the authorization logic
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: [
    '/shop/:path*',
    '/admin',
    '/admin/:path*',
    // Match api/admin except multipart upload routes
    '/api/admin/((?!gallery|products).*)',
  ],
};
