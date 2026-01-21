import { DatabaseClient } from './client';

/**
 * Create a Supabase client for server-side usage (legacy compatibility)
 * Re-exports the service database client
 */
export function createClient() {
    return DatabaseClient.getServiceClient();
}

export type SupabaseServerClient = ReturnType<typeof createClient>;
