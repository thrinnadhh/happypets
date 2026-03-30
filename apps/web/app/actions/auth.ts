/**
 * Server Actions for Authentication
 * Handles login, register, logout, and profile updates
 */

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema } from '@happypets/shared';
import type { LoginInput, RegisterInput } from '@happypets/shared';
import { getLogger } from '@/lib/logger';

const logger = getLogger('auth:actions');

/**
 * Login user
 */
export const loginAction = async (input: LoginInput) => {
  try {
    const validatedInput = loginSchema.parse(input);
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
 * Register new user
 */
export const registerAction = async (input: RegisterInput) => {
  try {
    const validatedInput = registerSchema.parse(input);
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
      return {
        success: false,
        error: signUpError.message || 'Registration failed',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Registration failed',
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
