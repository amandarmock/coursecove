import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Typed Supabase client for browser/client-side usage
 * Uses anon key - RLS policies are enforced
 */
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Typed Supabase client for server-side/admin usage
 * Uses service role key - BYPASSES RLS
 * Use only in: webhooks, background jobs, admin operations
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Create a typed Supabase client with custom auth context
 * Used for RLS enforcement in tRPC context
 */
export function createSupabaseClient(accessToken?: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      },
    }
  );
}

// Re-export Database type for convenience
export type { Database } from '@/types/supabase';
