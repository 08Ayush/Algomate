import { serviceDb as supabase } from '@/shared/database';
export class HealthChecker {
    // Uses serviceDb (Neon) for all health checks.
    private static get supabase() {
        return supabase;
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
