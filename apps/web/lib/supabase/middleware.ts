/**
 * Supabase Middleware
 * Refreshes session cookies and checks for blacklisted sessions
 * Called from apps/web/middleware.ts before each request
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';
import { isSessionBlacklisted } from '@/lib/redis';
import { getLogger } from '@/lib/logger';

const logger = getLogger('supabase:middleware');

/**
 * Update Supabase session and check for blacklisting
 * @param request - Next.js request object
 * @returns NextResponse with updated cookies or redirect
 */
export const updateSession = async (request: NextRequest) => {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Refresh session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If user is authenticated, check blacklist
    if (session?.user?.id) {
      const userId = session.user.id;
      const isBlacklisted = await isSessionBlacklisted(userId);

      if (isBlacklisted) {
        logger.info(`Blacklisted user ${userId} redirected to /suspended`);

        // Clear auth cookies
        response.cookies.delete('sb-auth-token');
        response.cookies.delete('sb-refresh-token');

        // Redirect to suspended page
        return NextResponse.redirect(new URL('/suspended', request.url));
      }
    }

    return response;
  } catch (error) {
    logger.error('Error in updateSession middleware:', error);
    // Continue without blocking on middleware error
    return response;
  }
};

export default updateSession;
