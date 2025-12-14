import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export interface SetRLSContextOptions {
  /** If true, silently continue on error instead of throwing (useful during dev) */
  silent?: boolean;
}

/**
 * Sets PostgreSQL session variables for RLS policies
 * Uses the custom set_rls_context function we created in the migration
 *
 * @param supabase - Supabase client
 * @param clerkUserId - Clerk user ID (user_xxx) or null
 * @param orgId - Internal organization ID (cuid) or null
 * @param options - Configuration options
 */
export async function setRLSContext(
  supabase: SupabaseClient<Database>,
  clerkUserId: string | null,
  orgId: string | null,
  options: SetRLSContextOptions = {}
): Promise<void> {
  // Use our custom set_rls_context function
  const { error } = await supabase.rpc('set_rls_context', {
    p_clerk_user_id: clerkUserId ?? '',
    p_org_id: orgId ?? '',
  });

  if (error) {
    // In silent mode, only log if it's a real error (not "function doesn't exist")
    if (options.silent) {
      if (!error.message.includes('function') && !error.message.includes('does not exist')) {
        console.error('Failed to set RLS context:', error);
      }
      return;
    }
    console.error('Failed to set RLS context:', error);
    throw error;
  }
}
