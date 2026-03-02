/**
 * Neon PostgreSQL Client
 * ========================
 * Central database connection for the Academic Compass project.
 * Replaces @supabase/supabase-js database calls with direct Neon connections.
 *
 * DATABASE_URL     → pooled connection  (use in API routes / server components)
 * DATABASE_URL_UNPOOLED → direct connection (use for migrations only)
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        '[db] DATABASE_URL is not set. Add it to .env(.local) and restart the dev server.'
      );
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * Execute a parameterised SQL query and return all matching rows.
 * @example
 *   const users = await query('SELECT * FROM users WHERE role = $1', ['admin']);
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a parameterised SQL query and return a single row (or null).
 */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Execute a SQL query and wrap the result in a Supabase-style response object.
 * Useful for gradual migration of existing code.
 */
export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    const data = await query<T>(text, params);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

export default getPool;
