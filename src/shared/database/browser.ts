import { serviceDb as supabase } from '@/shared/database';
import { DatabaseClient } from './client';

/**
 * Create a Neon client for client-side usage (legacy compatibility).
 */
export function createClient() {
  return DatabaseClient.getInstance();
}

export type SupabaseClient = ReturnType<typeof createClient>;
