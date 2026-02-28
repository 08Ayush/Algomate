import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class HealthChecker {
    // Lazy singleton — created on first use, not at class-load time.
    // This avoids the static-field antipattern where the client is
    // constructed before .env.local is loaded by Next.js.
    private static _supabase: SupabaseClient | null = null;

    private static get supabase(): SupabaseClient {
        if (!this._supabase) {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (!url || !key) {
                throw new Error(
                    'HealthChecker: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
                    'Ensure .env.local is present and the dev server has been restarted after any changes.'
                );
            }
            this._supabase = createClient(url, key);
        }
        return this._supabase;
    }

    /**
     * Check simple liveness (is the app running, environment loaded)
     */
    static async checkLiveness(): Promise<boolean> {
        return !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    }

    /**
     * Check readiness (is database connected)
     */
    static async checkReadiness(): Promise<{ isReady: boolean; details: any }> {
        const start = Date.now();
        try {
            // Simple query to check DB connection
            // We can query a small table or just use 'count' on a known table like 'users' or 'colleges'
            // OR simply check if we can connect.
            const { data, error } = await this.supabase
                .from('colleges')
                .select('count', { count: 'exact', head: true });

            const latency = Date.now() - start;

            if (error) {
                return {
                    isReady: false,
                    details: {
                        database: 'disconnected',
                        error: error.message,
                        latency
                    }
                };
            }

            return {
                isReady: true,
                details: {
                    database: 'connected',
                    latency
                }
            };

        } catch (err: any) {
            return {
                isReady: false,
                details: {
                    database: 'error',
                    error: err.message,
                    latency: Date.now() - start
                }
            };
        }
    }
}
