import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Boot-time environment guard
// ---------------------------------------------------------------------------
// Detects missing OR placeholder values (e.g. "your-project-id.supabase.co")
// that would silently cause ENOTFOUND errors at runtime.
// Runs only in the Node.js server process (not in the browser bundle or during
// `next build` static analysis).
// ---------------------------------------------------------------------------
const PLACEHOLDER_PATTERNS = ['your-project-id', 'your_', '<your', 'placeholder'];

function warnIfPlaceholder(key: string, value: string | undefined): void {
    if (!value) return;
    const lower = value.toLowerCase();
    if (PLACEHOLDER_PATTERNS.some(p => lower.includes(p))) {
        console.warn(
            `\x1b[33m[Database] WARNING: ${key} appears to contain a placeholder value ("${value}"). ` +
            `Replace it with your real Supabase project credentials in .env.local ` +
            `and restart the dev server.\x1b[0m`
        );
    }
}

// Run once at module load (server-side only, skip during browser/build)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
    warnIfPlaceholder('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
    warnIfPlaceholder('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    warnIfPlaceholder('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

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
                console.error(
                    '[Database] Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
                    'This is expected during `next build`, but CRITICAL at runtime. ' +
                    'Ensure .env.local is present and the dev server has been restarted after changes.'
                );
                return null as unknown as SupabaseClient;
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

// ---------------------------------------------------------------------------
// Lazy Proxy exports
// ---------------------------------------------------------------------------
// IMPORTANT: Do NOT eagerly call DatabaseClient.getInstance() / getServiceClient()
// at module-load time. If this module is imported before Next.js has loaded
// .env.local (e.g. during `next build` static analysis), those calls return
// null and forever freeze the cached reference.
//
// Instead, each exported constant is a Proxy that forwards every property
// access to a fresh DatabaseClient.getInstance() call. The singleton logic
// inside DatabaseClient still ensures only ONE real SupabaseClient is created.
// ---------------------------------------------------------------------------

export const db = new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
        const client = DatabaseClient.getInstance();
        if (!client) {
            throw new Error(
                'Supabase client (db) is not initialised. ' +
                'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
                'are set in .env.local and that the dev server has been restarted.'
            );
        }
        return Reflect.get(client, prop, receiver);
    }
});

export const serviceDb = new Proxy({} as SupabaseClient, {
    get(_target, prop, receiver) {
        const client = DatabaseClient.getServiceClient();
        if (!client) {
            throw new Error(
                'Supabase service client (serviceDb) is not initialised. ' +
                'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
                'are set in .env.local and that the dev server has been restarted.'
            );
        }
        return Reflect.get(client, prop, receiver);
    }
});

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
