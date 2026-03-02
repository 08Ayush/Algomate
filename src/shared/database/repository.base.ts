// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;
import type { Database } from './types';

/**
 * Base Repository
 *
 * Provides common CRUD operations for all repositories.
 * Extend this class to create specific repositories for each table.
 */
export abstract class BaseRepository<T extends keyof Database['public']['Tables'], E = Database['public']['Tables'][T]['Row']> {
    constructor(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        protected readonly db: AnyClient,
        protected readonly tableName: T
    ) { }

    async findById(id: string): Promise<E | null> {
        const { data, error } = await this.db
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data as unknown as E;
    }

    async findAll(): Promise<E[]> {
        const { data, error } = await this.db.from(this.tableName).select('*');
        if (error) throw error;
        return data as unknown as E[];
    }

    protected async insertRow(
        data: Database['public']['Tables'][T]['Insert']
    ): Promise<Database['public']['Tables'][T]['Row']> {
        const { data: result, error } = await this.db
            .from(this.tableName)
            .insert(data as Record<string, unknown>)
            .select()
            .single();
        if (error) throw error;
        return result as unknown as Database['public']['Tables'][T]['Row'];
    }

    protected async updateRow(
        id: string,
        data: Database['public']['Tables'][T]['Update']
    ): Promise<Database['public']['Tables'][T]['Row']> {
        const { data: result, error } = await this.db
            .from(this.tableName)
            .update(data as Record<string, unknown>)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return result as unknown as Database['public']['Tables'][T]['Row'];
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from(this.tableName)
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }
}
