/**
 * Neon ↔ Supabase Compatibility Shim
 * =====================================
 * Provides a drop-in replacement for the @supabase/supabase-js client API,
 * backed by a Neon/PostgreSQL connection via the `pg` Pool.
 *
 * Supported chain methods:
 *   .from(table)
 *   .select(columns)
 *   .eq / .neq / .lt / .lte / .gt / .gte
 *   .in / .is / .not / .or / .like / .ilike / .contains / .filter
 *   .order / .limit / .range / .single / .maybeSingle
 *   .insert / .update / .upsert / .delete
 *   .returns result as { data, error }
 *
 * Error codes:
 *   PGRST116 — no rows found (mirrors Supabase PostgREST)
 */

import { Pool } from 'pg';
import { getPool } from './db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseResponse<T = any> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  count?: number | null;
  error: { message: string; code: string; details?: string } | null;
};

type Condition = { sql: string; params: unknown[] };

type Operation = 'select' | 'insert' | 'update' | 'upsert' | 'delete';

// ---------------------------------------------------------------------------
// Query Builder
// ---------------------------------------------------------------------------

class QueryBuilder<T = Record<string, unknown>> {
  private _pool: Pool;
  private _table: string;
  private _op: Operation = 'select';
  private _selectCols: string = '*';
  private _conditions: Condition[] = [];
  private _orderBy: string | null = null;
  private _limitVal: number | null = null;
  private _offsetVal: number | null = null;
  private _singleRow = false;
  private _maybeSingleRow = false;
  private _countExact = false;
  private _insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private _updateData: Record<string, unknown> | null = null;
  private _upsertConflictCol: string | null = null;
  private _returningCols: string | null = null;
  private _paramIdx = 0;

  constructor(pool: Pool, table: string) {
    this._pool = pool;
    this._table = table;
  }

  // ── SELECT ──────────────────────────────────────────────────────────────

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this._selectCols = columns || '*';
    if (this._op === 'insert' || this._op === 'update' || this._op === 'upsert' || this._op === 'delete') {
      this._returningCols = columns || '*';
    }
    if (options?.count) this._countExact = true;
    return this;
  }

  /** Supabase-compat: type hint only — no-op at runtime */
  returns<U = T>(): QueryBuilder<U> {
    return this as unknown as QueryBuilder<U>;
  }

  // ── WHERE conditions ────────────────────────────────────────────────────

  private _addCond(sql: string, params: unknown[]): this {
    this._conditions.push({ sql, params });
    return this;
  }

  private _nextParam(val: unknown): string {
    this._paramIdx++;
    return `$${this._paramIdx}`;
  }

  eq(col: string, val: unknown): this {
    if (val === null) return this.is(col, null);
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" = ${p}`, [val]);
  }

  neq(col: string, val: unknown): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" != ${p}`, [val]);
  }

  lt(col: string, val: unknown): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" < ${p}`, [val]);
  }

  lte(col: string, val: unknown): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" <= ${p}`, [val]);
  }

  gt(col: string, val: unknown): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" > ${p}`, [val]);
  }

  gte(col: string, val: unknown): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" >= ${p}`, [val]);
  }

  in(col: string, vals: unknown[]): this {
    if (!vals || vals.length === 0) {
      return this._addCond('FALSE', []);
    }
    const placeholders = vals.map(() => `$${++this._paramIdx}`).join(', ');
    return this._addCond(`"${col}" IN (${placeholders})`, vals);
  }

  is(col: string, val: null | boolean): this {
    if (val === null) {
      return this._addCond(`"${col}" IS NULL`, []);
    }
    return this._addCond(`"${col}" IS ${val ? 'TRUE' : 'FALSE'}`, []);
  }

  not(col: string, operator: string, val: unknown): this {
    if (operator === 'is' && val === null) {
      return this._addCond(`"${col}" IS NOT NULL`, []);
    }
    if (operator === 'in' && Array.isArray(val)) {
      const placeholders = (val as unknown[]).map(() => `$${++this._paramIdx}`).join(', ');
      return this._addCond(`"${col}" NOT IN (${placeholders})`, val as unknown[]);
    }
    const p = `$${++this._paramIdx}`;
    return this._addCond(`NOT ("${col}" ${operator.toUpperCase()} ${p})`, [val]);
  }

  like(col: string, pattern: string): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" LIKE ${p}`, [pattern]);
  }

  ilike(col: string, pattern: string): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" ILIKE ${p}`, [pattern]);
  }

  contains(col: string, val: unknown): this {
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" @> ${p}`, [
      typeof val === 'object' ? JSON.stringify(val) : val,
    ]);
  }

  filter(col: string, operator: string, val: unknown): this {
    const opMap: Record<string, string> = {
      eq: '=', neq: '!=', lt: '<', lte: '<=', gt: '>', gte: '>=',
      like: 'LIKE', ilike: 'ILIKE',
    };
    const sqlOp = opMap[operator] || operator.toUpperCase();
    const p = `$${++this._paramIdx}`;
    return this._addCond(`"${col}" ${sqlOp} ${p}`, [val]);
  }

  /**
   * Handle simple OR strings like "field.eq.value,field2.eq.value2"
   */
  or(filters: string): this {
    const parts = filters.split(',').map(f => {
      const [col, op, ...rest] = f.trim().split('.');
      const val = rest.join('.');
      const opMap: Record<string, string> = {
        eq: '=', neq: '!=', lt: '<', lte: '<=', gt: '>', gte: '>=',
        like: 'LIKE', ilike: 'ILIKE', is: 'IS',
      };
      const sqlOp = opMap[op] || op?.toUpperCase() || '=';
      const p = `$${++this._paramIdx}`;
      const params: unknown[] = val === 'null' ? [] : [val === 'true' ? true : val === 'false' ? false : val];
      const sql = val === 'null'
        ? `"${col}" IS NULL`
        : `"${col}" ${sqlOp} ${p}`;
      return { sql, params };
    });
    const combined = parts.map(p => p.sql).join(' OR ');
    const allParams = parts.flatMap(p => p.params);
    return this._addCond(`(${combined})`, allParams);
  }

  // ── MODIFIERS ────────────────────────────────────────────────────────────

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const dir = opts?.ascending === false ? 'DESC' : 'ASC';
    const nulls = opts?.nullsFirst ? 'NULLS FIRST' : 'NULLS LAST';
    this._orderBy = `"${col}" ${dir} ${nulls}`;
    return this;
  }

  limit(n: number): this {
    this._limitVal = n;
    return this;
  }

  range(from: number, to: number): this {
    this._offsetVal = from;
    this._limitVal = to - from + 1;
    return this;
  }

  single(): this {
    this._singleRow = true;
    this._limitVal = 1;
    return this;
  }

  maybeSingle(): this {
    this._maybeSingleRow = true;
    this._limitVal = 1;
    return this;
  }

  // ── MUTATION OPS ─────────────────────────────────────────────────────────

  insert(data: Record<string, unknown> | Record<string, unknown>[]): this {
    this._op = 'insert';
    this._insertData = data;
    return this;
  }

  update(data: Record<string, unknown>): this {
    this._op = 'update';
    this._updateData = data;
    return this;
  }

  upsert(
    data: Record<string, unknown> | Record<string, unknown>[],
    opts?: { onConflict?: string }
  ): this {
    this._op = 'upsert';
    this._insertData = data;
    this._upsertConflictCol = opts?.onConflict || 'id';
    return this;
  }

  delete(): this {
    this._op = 'delete';
    return this;
  }

  // ── SQL BUILDER ──────────────────────────────────────────────────────────

  private _buildSelect(): { text: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereParams: unknown[] = [];
    const whereClauses = this._conditions.map(c => {
      whereParams.push(...c.params);
      return c.sql;
    });

    // Flatten all params from conditions (already parameterised)
    params.push(...whereParams);

    let cols = this._selectCols;
    // Strip relation expansions (e.g. "*, users(id)") → just '*' for now
    if (cols.includes('(')) cols = '*';

    // Inject window function for count: 'exact'
    if (this._countExact) {
      cols = cols === '*' ? `*, COUNT(*) OVER() AS "_neon_total_"` : `${cols}, COUNT(*) OVER() AS "_neon_total_"`;
    }

    let sql = `SELECT ${cols} FROM "${this._table}"`;
    if (whereClauses.length) sql += ` WHERE ${whereClauses.join(' AND ')}`;
    if (this._orderBy) sql += ` ORDER BY ${this._orderBy}`;
    if (this._limitVal !== null) sql += ` LIMIT ${this._limitVal}`;
    if (this._offsetVal !== null) sql += ` OFFSET ${this._offsetVal}`;

    return { text: sql, params };
  }

  private _buildInsert(): { text: string; params: unknown[] } {
    const rows = Array.isArray(this._insertData) ? this._insertData : [this._insertData!];
    const cols = Object.keys(rows[0]);
    const params: unknown[] = [];
    let paramIdx = 0;

    const valueSets = rows.map(row => {
      const placeholders = cols.map(col => {
        const val = (row as Record<string, unknown>)[col];
        params.push(typeof val === 'object' && val !== null && !Array.isArray(val)
          ? JSON.stringify(val) : val);
        return `$${++paramIdx}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    const colStr = cols.map(c => `"${c}"`).join(', ');
    const returning = this._returningCols || '*';
    let sql = `INSERT INTO "${this._table}" (${colStr}) VALUES ${valueSets.join(', ')}`;

    if (this._op === 'upsert' && this._upsertConflictCol) {
      const updateSet = cols
        .filter(c => c !== this._upsertConflictCol && c !== 'id' && c !== 'created_at')
        .map(c => `"${c}" = EXCLUDED."${c}"`)
        .join(', ');
      sql += ` ON CONFLICT ("${this._upsertConflictCol}") DO UPDATE SET ${updateSet}`;
    }

    sql += ` RETURNING ${returning}`;
    return { text: sql, params };
  }

  private _buildUpdate(): { text: string; params: unknown[] } {
    const data = this._updateData!;
    const params: unknown[] = [];
    let paramIdx = 0;

    const setClauses = Object.entries(data).map(([col, val]) => {
      params.push(typeof val === 'object' && val !== null && !Array.isArray(val)
        ? JSON.stringify(val) : val);
      return `"${col}" = $${++paramIdx}`;
    });

    const condParams: unknown[] = [];
    const whereClauses = this._conditions.map(c => {
      // re-parameterise conditions after SET params
      const reparametrised = c.sql.replace(/\$(\d+)/g, (_, n) => {
        return `$${paramIdx + parseInt(n)}`;
      });
      condParams.push(...c.params);
      return reparametrised;
    });
    params.push(...condParams);

    const returning = this._returningCols || '*';
    let sql = `UPDATE "${this._table}" SET ${setClauses.join(', ')}`;
    if (whereClauses.length) sql += ` WHERE ${whereClauses.join(' AND ')}`;
    sql += ` RETURNING ${returning}`;

    return { text: sql, params };
  }

  private _buildDelete(): { text: string; params: unknown[] } {
    const params: unknown[] = this._conditions.flatMap(c => c.params);
    const whereClauses = this._conditions.map(c => c.sql);
    const returning = this._returningCols || '*';

    let sql = `DELETE FROM "${this._table}"`;
    if (whereClauses.length) sql += ` WHERE ${whereClauses.join(' AND ')}`;
    if (this._returningCols) sql += ` RETURNING ${returning}`;

    return { text: sql, params };
  }

  // ── EXECUTE ──────────────────────────────────────────────────────────────

  private async _execute(): Promise<SupabaseResponse<T>> {
    let text: string;
    let params: unknown[];

    try {
      switch (this._op) {
        case 'insert':
        case 'upsert': {
          const q = this._buildInsert();
          text = q.text; params = q.params;
          break;
        }
        case 'update': {
          const q = this._buildUpdate();
          text = q.text; params = q.params;
          break;
        }
        case 'delete': {
          const q = this._buildDelete();
          text = q.text; params = q.params;
          break;
        }
        default: {
          const q = this._buildSelect();
          text = q.text; params = q.params;
        }
      }

      const result = await this._pool.query(text, params);
      const rows = result.rows as T[];

      // single() — must find exactly one row
      if (this._singleRow) {
        if (rows.length === 0) {
          return {
            data: null,
            error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
          };
        }
        return { data: rows[0] as T, error: null };
      }

      // maybeSingle() — return null when not found
      if (this._maybeSingleRow) {
        return { data: rows[0] ?? null, error: null };
      }

      // Mutations that return rows
      if (this._op !== 'select') {
        if (this._returningCols) {
          return { data: (rows.length === 1 ? rows[0] : rows) as unknown as T, error: null };
        }
        return { data: null, error: null };
      }

      const count = this._countExact ? (rows.length > 0 ? Number((rows[0] as Record<string, unknown>)['_neon_total_'] ?? rows.length) : 0) : undefined;
      if (this._countExact) rows.forEach(r => { delete (r as Record<string, unknown>)['_neon_total_']; });
      return { data: rows as unknown as T, error: null, count };
    } catch (err: unknown) {
      const e = err as Error & { code?: string };
      return {
        data: null,
        error: {
          message: e.message,
          code: e.code || 'DB_ERROR',
          details: e.stack,
        },
      };
    }
  }

  // Make QueryBuilder thenable so `await queryBuilder` works
  then<TResult1 = SupabaseResponse<T>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResponse<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this._execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<SupabaseResponse<T> | TResult> {
    return this._execute().catch(onrejected);
  }
}

// ---------------------------------------------------------------------------
// Neon Client (Supabase-compatible interface)
// ---------------------------------------------------------------------------

export class NeonClient {
  private _pool: Pool;

  constructor(pool?: Pool) {
    this._pool = pool || getPool();
  }

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this._pool, table);
  }

  /**
   * Stub: Supabase Auth methods — auth is handled by JWT in this project
   * These methods are provided as no-ops to avoid runtime errors in code
   * that still references supabase.auth.*
   */
  auth = {
    getUser: async (token?: string) => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async (_: unknown) => ({ data: null, error: { message: 'Use /api/auth/login' } }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: async (_: unknown) => ({ data: null, error: null }),
  };

  /**
   * Stub: Supabase Realtime — replaced by polling in hooks
   */
  channel(_name: string) {
    return {
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: (_cb?: unknown) => ({ unsubscribe: () => {} }),
      unsubscribe: () => {},
    };
  }

  removeChannel(_channel: unknown) {}
  removeAllChannels() {}

  /**
   * Stub: Supabase Storage — replaced by Cloudinary/local storage
   */
  storage = {
    from: (_bucket: string) => ({
      upload: async (_path: string, _file: unknown) => ({ data: null, error: { message: 'Storage not configured. Use Cloudinary.' } }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
      remove: async (_paths: string[]) => ({ data: null, error: null }),
      list: async (_prefix?: string) => ({ data: [], error: null }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Factory function matching Supabase's createClient signature
// ---------------------------------------------------------------------------

/**
 * Drop-in replacement for `createClient` from @supabase/supabase-js
 * Returns a NeonClient backed by the Neon PostgreSQL connection pool.
 *
 * The `url` and `key` parameters are accepted but ignored —
 * the connection is read from the DATABASE_URL environment variable.
 */
export function createNeonClient(_url?: string, _key?: string): NeonClient {
  return new NeonClient(getPool());
}

// Default singleton instances
export const neonDb = new NeonClient();
export const neonServiceDb = new NeonClient();

export default createNeonClient;
