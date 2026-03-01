import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Base Repository
 * 
 * Provides common CRUD operations for all repositories.
 * Extend this class to create specific repositories for each table.
 * 
 * @example
 * ```typescript
 * class UserRepository extends BaseRepository<'users'> {
 *   constructor(db: SupabaseClient<Database>) {
 *     super(db, 'users');
 *   }
 * }
 * ```
 */
export abstract class BaseRepository<T extends keyof Database['public']['Tables'], E = Database['public']['Tables'][T]['Row']> {
    constructor(
        protected readonly db: SupabaseClient<Database>,
        protected readonly tableName: T
    ) { }

    /**
     * Find a record by ID
     */
    async findById(id: string): Promise<E | null> {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('id' as any, id as any)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found
                return null;
            }
            throw error;
        }

        return data as unknown as E;
    }

    /**
     * Find all records
     */
    async findAll(): Promise<E[]> {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*');

        if (error) throw error;

        return data as unknown as E[];
    }

    /**
     * Insert a new record (protected helper for subclasses)
     */
    protected async insertRow(
        data: Database['public']['Tables'][T]['Insert']
    ): Promise<Database['public']['Tables'][T]['Row']> {
        const { data: result, error } = await this.db
            .from(this.tableName)
            .insert(data as any)
            .select()
            .single();

        if (error) throw error;

        return result as unknown as Database['public']['Tables'][T]['Row'];
    }

    /**
     * Update a record by ID (protected helper for subclasses)
     */
    protected async updateRow(
        id: string,
        data: Database['public']['Tables'][T]['Update']
    ): Promise<Database['public']['Tables'][T]['Row']> {
        const { data: result, error } = await this.db
            .from(this.tableName)
            .update(data as any)
            .eq('id' as any, id as any)
            .select()
            .single();

        if (error) throw error;

        return result as unknown as Database['public']['Tables'][T]['Row'];
    }

    /**
     * Delete a record by ID
     */
    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from(this.tableName)
            .delete()
            .eq('id' as any, id as any);

        if (error) throw error;

        return true;
    }

    /**
     * Count records (with optional filter)
     */
    async count(filter?: Record<string, any>): Promise<number> {
        let query = this.db
            .from(this.tableName)
            .select('*', { count: 'exact', head: true });

        if (filter) {
            Object.entries(filter).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
        }

        const { count, error } = await query;

        if (error) throw error;

        return count || 0;
    }

    /**
     * Check if a record exists
     */
    async exists(id: string): Promise<boolean> {
        const record = await this.findById(id);
        return record !== null;
    }
}
