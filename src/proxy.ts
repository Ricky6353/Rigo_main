import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Shop category URL cleanup only. /admin auth is handled in src/app/admin/layout.tsx */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const categories = ['tees', 'polos', 'hoodies'];
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/shop/:path*'],
};
