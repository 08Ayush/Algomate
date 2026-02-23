import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Database Client - Singleton pattern for Supabase connection
 * 
 * This provides a centralized database client that can be used across
 * all modules without creating multiple connections.
 */
class DatabaseClient {
    private static instance: SupabaseClient | null = null;
    private static serviceInstance: SupabaseClient | null = null;

    /**
     * Get the standard Supabase client (uses anon key)
     * This respects Row Level Security (RLS) policies
     */
    static getInstance(): SupabaseClient {
        if (!this.instance) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
            }

            this.instance = createClient(supabaseUrl, supabaseKey);
        }

        return this.instance;
    }

    /**
     * Get the service role client (bypasses RLS)
     * Use with caution - only for admin operations
     */
    static getServiceClient(): SupabaseClient {
        // Safety check: Prevent service client initialization in browser
        if (typeof window !== 'undefined') {
            return null as unknown as SupabaseClient;
        }

        if (!this.serviceInstance) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

            // On server, we must have the key. If missing, throw error.
            if (!supabaseUrl || !serviceRoleKey) {
                console.error('Missing Supabase service role key. This is expected during build time or in browser, but critical on server.');
                // Graceful fallback to avoid crashing build/browser if mistakenly imported
                return null as unknown as SupabaseClient;
            }

            this.serviceInstance = createClient(supabaseUrl, serviceRoleKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        }

        return this.serviceInstance;
    }

    /**
     * Reset instances (useful for testing)
     */
    static reset(): void {
        this.instance = null;
        this.serviceInstance = null;
    }
}

// Export singleton instances
export const db = DatabaseClient.getInstance();
export const serviceDb = DatabaseClient.getServiceClient();

// Legacy aliases for migration compatibility
export const supabase = db;
export const supabaseAdmin = serviceDb;

// Server/Client createClient wrappers for compatibility
export function createServerClient() {
    return DatabaseClient.getServiceClient();
}

export function createBrowserClient() {
    return DatabaseClient.getInstance();
}

// Export class for testing
export { DatabaseClient };
