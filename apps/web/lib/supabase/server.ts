/**
 * Supabase Server Client
 * Used for server-side operations with service role or user auth
 * Includes profile fetching, role validation, and suspension checks
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import type { Database } from '@/lib/database.types';
import type { Profile } from '@happypets/shared';
import { UserRole, UserStatus } from '@happypets/shared';
import { getLogger } from '@/lib/logger';
import { isSessionBlacklisted } from '@/lib/redis';

const logger = getLogger('supabase:server');

/**
 * Create Supabase server client with cookies
 */
const createClient = () => {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            logger.error('Failed to set cookies:', error);
          }
        },
      },
    }
  );
};

/**
 * Get current user session
 * @returns Session object or null
 */
export const getSession = async () => {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session;
  } catch (error) {
    logger.error('Failed to get session:', error);
    return null;
  }
};

/**
 * Get current authenticated user with profile
 * Checks: session exists, profile exists, not suspended, not blacklisted
 * @returns Profile object or null
 */
export const getUser = async (): Promise<Profile | null> => {
  try {
    const supabase = createClient();

    // Get session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      logger.debug('No session found');
      return null;
    }

    const userId = session.user.id;

    // Check Redis blacklist (suspended/invalidated sessions)
    const isBlacklisted = await isSessionBlacklisted(userId);
    if (isBlacklisted) {
      logger.info(`Session blacklisted for user ${userId}`);
      await supabase.auth.signOut();
      return null;
    }

    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !profile) {
      logger.error(`Profile not found for user ${userId}:`, error);
      return null;
    }

    // Check if suspended
    if (profile.status === UserStatus.SUSPENDED) {
      logger.info(`Suspended user ${userId} attempted access`);
      await supabase.auth.signOut();
      return null;
    }

    // Check if deleted
    if (profile.status === UserStatus.DELETED) {
      logger.info(`Deleted user ${userId} attempted access`);
      await supabase.auth.signOut();
      return null;
    }

    return profile as Profile;
  } catch (error) {
    logger.error('Error in getUser:', error);
    return null;
  }
};

/**
 * Require user to have specific role(s)
 * Redirects to appropriate page if unauthorized
 * @param roles - Array of allowed roles
 * @returns Profile if authorized
 */
export const requireRole = async (roles: UserRole[]): Promise<Profile> => {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  if (!roles.includes(user.role)) {
    // Redirect based on actual role
    switch (user.role) {
      case UserRole.SUPERADMIN:
        redirect('/superadmin/dashboard');
      case UserRole.ADMIN:
        redirect('/admin/dashboard');
      case UserRole.CUSTOMER:
      default:
        redirect('/');
    }
  }

  return user;
};

/**
 * Require user to be authenticated customer
 * @returns Profile
 */
export const requireCustomer = async (): Promise<Profile> => {
  return requireRole([UserRole.CUSTOMER]);
};

/**
 * Require user to be authenticated admin
 * @returns Profile
 */
export const requireAdmin = async (): Promise<Profile> => {
  return requireRole([UserRole.ADMIN]);
};

/**
 * Require user to be authenticated superadmin
 * @returns Profile
 */
export const requireSuperAdmin = async (): Promise<Profile> => {
  return requireRole([UserRole.SUPERADMIN]);
};

/**
 * Create Supabase client with service role key (admin operations only)
 * NEVER expose this client to the browser
 */
export const createServiceRoleClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
};

export default createClient;
