import { DatabaseClient } from './client';

/**
 * Create a Supabase client for client-side usage (legacy compatibility)
 * Returns the singleton browser database client
 */
export function createClient() {
    return DatabaseClient.getInstance();
}

export type SupabaseClient = ReturnType<typeof createClient>;
