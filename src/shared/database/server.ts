import { DatabaseClient } from './client';

/**
 * Create a Neon client for server-side usage (legacy compatibility).
 */
export function createClient() {
  return DatabaseClient.getServiceClient();
}

export type SupabaseServerClient = ReturnType<typeof createClient>;
