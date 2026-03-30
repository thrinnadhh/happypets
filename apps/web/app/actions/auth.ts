/**
 * Server Actions for Authentication
 * Handles login, register, logout, and profile updates
 */

'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema } from '@happypets/shared';
import type { LoginInput, RegisterInput } from '@happypets/shared';
import { getLogger } from '@/lib/logger';
import { rateLimit } from '@/lib/redis';

const logger = getLogger('auth:actions');

/**
 * Get client IP address from request headers
 */
const getClientIp = async (): Promise<string> => {
  const headersList = await headers();
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  );
};

/**
 * Login user with rate limiting
 */
export const loginAction = async (input: LoginInput) => {
  try {
    const validatedInput = loginSchema.parse(input);

    // Apply rate limiting: 10 attempts per minute per IP
    const clientIp = await getClientIp();
    const rateLimitResult = await rateLimit(clientIp, 10, 60);

    if (!rateLimitResult.allowed) {
      logger.warn(`Rate limit exceeded for IP ${clientIp}`);
      return {
        success: false,
        error: 'Too many login attempts. Please try again later.',
      };
    }

    const supabase = createClient();

    const { error, data } = await supabase.auth.signInWithPassword({
      email: validatedInput.email,
      password: validatedInput.password,
    });

    if (error) {
      logger.warn(`Login failed for ${validatedInput.email}: ${error.message}`);
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Login failed',
      };
    }

    logger.info(`User ${data.user.id} logged in`);

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    logger.error('Login action error:', error);
    return {
      success: false,
      error: 'An error occurred during login',
    };
  }
};

/**
 * Register new user with rate limiting
 */
export const registerAction = async (input: RegisterInput) => {
  try {
    const validatedInput = registerSchema.parse(input);

    // Apply rate limiting: 5 registration attempts per minute per IP
    const clientIp = await getClientIp();
    const rateLimitResult = await rateLimit(clientIp, 5, 60);

    if (!rateLimitResult.allowed) {
      logger.warn(`Rate limit exceeded for registration from IP ${clientIp}`);
      return {
        success: false,
        error: 'Too many registration attempts. Please try again later.',
      };
    }

    const supabase = createClient();

    // Sign up with Supabase Auth
    const { error: signUpError, data } = await supabase.auth.signUp({
      email: validatedInput.email,
      password: validatedInput.password,
      options: {
        data: {
          full_name: validatedInput.full_name,
          phone: validatedInput.phone,
        },
      },
    });

    if (signUpError) {
      logger.warn(`Registration failed for ${validatedInput.email}: ${signUpError.message}`);
      // Return generic message to prevent account enumeration (HIGH-3)
      return {
        success: false,
        error: 'Registration failed. Please check your details and try again.',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Registration failed. Please check your details and try again.',
      };
    }

    logger.info(`New user registered: ${data.user.id}`);

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    logger.error('Register action error:', error);
    return {
      success: false,
      error: 'An error occurred during registration',
    };
  }
};

/**
 * Logout user and redirect to login
 */
export const logoutAction = async () => {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Logout error:', error);
    }

    logger.info('User logged out');
  } catch (error) {
    logger.error('Logout action error:', error);
  }

  // redirect() throws internally, so this effectively never returns
  redirect('/login');
};
