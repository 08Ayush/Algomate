import { SupabaseClient } from '@supabase/supabase-js';
import { IDepartmentRepository } from '../../domain/repositories/IDepartmentRepository';
import { Department } from '../../domain/entities/Department';
import { Database } from '@/shared/database';

export class SupabaseDepartmentRepository implements IDepartmentRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Department {
        return new Department(
            row.id,
            row.name,
            row.code,
            row.description,
            row.college_id,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Department | null> {
        const { data, error } = await this.db
            .from('departments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return this.mapToEntity(data);
    }

    async findAll(): Promise<Department[]> {
        const { data, error } = await this.db
            .from('departments')
            .select('*');

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findByCollege(collegeId: string, page?: number, limit?: number): Promise<{ items: Department[]; total: number }> {
        let query = this.db
            .from('departments')
            .select('*', { count: 'exact' })
            .eq('college_id', collegeId);

        if (page && limit) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw error;
        return {
            items: (data || []).map(row => this.mapToEntity(row)),
            total: count || 0
        };
    }

    async create(department: Pick<Department, 'name' | 'code' | 'collegeId' | 'description'>): Promise<Department> {
        const { data, error } = await this.db
            .from('departments')
            .insert({
                name: department.name,
                code: department.code,
                description: department.description,
                college_id: department.collegeId
            } as any)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async update(id: string, data: Partial<Department>): Promise<Department> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.code) updateData.code = data.code;
        if (data.description !== undefined) updateData.description = data.description;
        // college_id shouldn't generally count as updateable via standard updates unless specified

        updateData.updated_at = new Date().toISOString();

        const { data: row, error } = await this.db
            .from('departments')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(row);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async countByCollege(collegeId: string): Promise<number> {
        const { count, error } = await this.db
            .from('departments')
            .select('*', { count: 'exact', head: true })
            .eq('college_id', collegeId);

        if (error) throw error;
        return count || 0;
    }
}
