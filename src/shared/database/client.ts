/**
 * Database Client -- Neon PostgreSQL (replaces Supabase)
 * =====================================================
 * Provides db, serviceDb, supabase, supabaseAdmin exports
 * backed by the Neon connection pool.
 *
 * All existing code using .from().select().eq()... continues to work
 * via the NeonClient compatibility shim in src/lib/neon-supabase-compat.ts
 */

import { NeonClient, createNeonClient } from '@/lib/neon-supabase-compat';

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------

class DatabaseClientFactory {
  private static instance: NeonClient | null = null;
  private static serviceInstance: NeonClient | null = null;

  static getInstance(): NeonClient {
    if (!this.instance) {
      this.instance = createNeonClient();
    }
    return this.instance;
  }

  static getServiceClient(): NeonClient {
    if (!this.serviceInstance) {
      this.serviceInstance = createNeonClient();
    }
    return this.serviceInstance;
  }

  static reset(): void {
    this.instance = null;
    this.serviceInstance = null;
  }
}

// Keep the class exportable as DatabaseClient for compatibility
export { DatabaseClientFactory as DatabaseClient };

// ---------------------------------------------------------------------------
// Lazy-proxy exports (same pattern as before)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = new Proxy({} as any, {
  get(_target, prop, receiver) {
    return Reflect.get(DatabaseClientFactory.getInstance(), prop, receiver);
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const serviceDb = new Proxy({} as any, {
  get(_target, prop, receiver) {
    return Reflect.get(DatabaseClientFactory.getServiceClient(), prop, receiver);
  },
});

// Legacy aliases
export const supabase = serviceDb;
export const supabaseAdmin = serviceDb;

export function createServerClient(): NeonClient {
  return DatabaseClientFactory.getServiceClient();
}

export function createBrowserClient(): NeonClient {
  return DatabaseClientFactory.getInstance();
}
