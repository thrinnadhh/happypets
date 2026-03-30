/**
 * Supabase Browser Client (Singleton)
 * Used for client-side operations with RLS policies enforced
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.types';

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get or create Supabase browser client singleton
 * @returns Supabase client instance
 */
export const getSupabaseBrowserClient = () => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return supabaseClient;
};

export default getSupabaseBrowserClient;
