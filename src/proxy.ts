import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function proxy(request) {
    const { pathname } = request.nextUrl;
    
    // Define categories to redirect
    const categories = ['tees', 'sweatshirt', 'hoodies'];
    
    // Check if pathname matches /shop/[category]
    const shopMatch = pathname.match(/^\/shop\/([^/]+)$/);
    
    if (shopMatch) {
      const slug = shopMatch[1];
      if (categories.includes(slug)) {
        // Redirect to /shop?category=slug
        const url = request.nextUrl.clone();
        url.pathname = '/shop';
        url.searchParams.set('category', slug);
        return NextResponse.redirect(url);
      }
    }

    const ADMIN_EMAILS = ['embroyitltdjay@gmail.com', 'embroyitricky@gmail.com'];

    // Admin portal and API protection
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
      if (!request.nextauth.token?.email || !ADMIN_EMAILS.includes(request.nextauth.token.email)) {
        const url = request.nextUrl.clone();
        url.pathname = '/404';
        return NextResponse.rewrite(url);
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
    '/admin/:path*', 
    // Match all api/admin except uploads which cause multipart stream issues with middleware
    '/api/admin/((?!gallery|products).*)'
  ],
};
