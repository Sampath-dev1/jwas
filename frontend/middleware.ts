import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, media, API calls, manifests, and favicon through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('jwas_auth_token')?.value;

  // If user is not logged in and not on login route, immediately send to login
  if (!token && pathname !== '/account/login') {
    const loginUrl = new URL('/account/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and visiting login, send straight to storefront home
  if (token && pathname === '/account/login') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static, _next/image
     * - favicon.ico, images, icons
     */
    '/((?!api|_next/static|_next/image|images|icons|favicon.ico|manifest.webmanifest|manifest.json).*)',
  ],
};
