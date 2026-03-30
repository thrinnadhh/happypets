/**
 * Next.js Middleware
 * Handles route protection, auth redirects, and session refresh
 * Runs on every request before reaching API routes or pages
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { getLogger } from '@/lib/logger';

const logger = getLogger('middleware');

// Routes that don't need protection
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/',
  '/browse',
  '/product',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/suspended',
];

// Protected routes and their required roles
const PROTECTED_ROUTES: Record<string, string[]> = {
  '/superadmin': ['superadmin'],
  '/admin': ['admin'],
  '/checkout': ['customer', 'admin', 'superadmin'],
  '/orders': ['customer', 'admin', 'superadmin'],
  '/profile': ['customer', 'admin', 'superadmin'],
  '/wishlist': ['customer'],
};

/**
 * Check if route requires authentication
 */
const isProtectedRoute = (pathname: string): boolean => {
  return Object.keys(PROTECTED_ROUTES).some((route) =>
    pathname.startsWith(route)
  );
};

/**
 * Check if route is public
 */
const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some((route) => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  });
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip middleware for Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Update session (refresh cookies, check blacklist)
  const response = await updateSession(request);

  // Get session info from cookies
  const hasSession = request.cookies.has('sb-auth-token');

  // If no session and protected route needed
  if (!hasSession && isProtectedRoute(pathname)) {
    const redirectUrl = new URL('/login', request.url);

    // Add redirect parameter for post-login redirect
    if (!isPublicRoute(pathname)) {
      redirectUrl.searchParams.set('redirect', pathname);
    }

    logger.debug(`Redirecting unauthenticated user from ${pathname} to login`);
    return NextResponse.redirect(redirectUrl);
  }

  // If logged in and on auth pages, redirect to dashboard
  if (hasSession && (pathname === '/login' || pathname === '/register')) {
    // Determine correct dashboard based on role from cookie
    const authCookie = request.cookies.get('sb-auth-token');

    if (authCookie?.value) {
      try {
        // Simple heuristic: could also decode JWT if needed
        // For now, redirect to home and let client-side redirect to correct dashboard
        logger.debug('Logged-in user redirecting from auth page');
        return NextResponse.redirect(new URL('/', request.url));
      } catch (error) {
        logger.error('Error reading auth cookie:', error);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
