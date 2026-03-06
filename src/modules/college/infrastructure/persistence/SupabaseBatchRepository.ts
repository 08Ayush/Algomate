import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { IBatchRepository } from '../../domain/repositories/IBatchRepository';
import { Batch } from '../../domain/entities/Batch';

export class SupabaseBatchRepository implements IBatchRepository {
    constructor(private readonly db: SupabaseClient) { }

    private mapToEntity(row: any): Batch {
        return new Batch(
            row.id,
            row.name,
            row.department_id,
            row.college_id,
            row.semester,
            row.academic_year,
            row.section,
            row.is_active,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Batch | null> {
        const { data, error } = await this.db
            .from('batches' as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }

    async findByCollege(collegeId: string): Promise<Batch[]> {
        const { data, error } = await this.db
            .from('batches' as any)
            .select('*')
            .eq('college_id', collegeId);

        if (error) throw error;
        return data.map((row: any) => this.mapToEntity(row));
    }

    async findByDepartment(departmentId: string): Promise<Batch[]> {
        const { data, error } = await this.db
            .from('batches' as any)
            .select('*')
            .eq('department_id', departmentId);

        if (error) throw error;
        return data.map((row: any) => this.mapToEntity(row));
    }

    async findActive(collegeId?: string, departmentId?: string): Promise<Batch[]> {
        let query = this.db
            .from('batches' as any)
            .select('*')
            .eq('is_active', true);

        if (collegeId) query = query.eq('college_id', collegeId);
        if (departmentId) query = query.eq('department_id', departmentId);

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data.map((row: any) => this.mapToEntity(row));
    }

    async create(batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Batch> {
        const { data, error } = await (this.db
            .from('batches' as any) as any)
            .insert({
                name: batch.name,
                department_id: batch.departmentId,
                college_id: batch.collegeId,
                semester: batch.semester,
                academic_year: batch.academicYear,
                section: batch.section,
                is_active: batch.isActive
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async update(id: string, data: Partial<Batch>): Promise<Batch> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.semester !== undefined) updateData.semester = data.semester;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;
        // ... other fields

        const { data: result, error } = await (this.db
            .from('batches' as any) as any)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('batches' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
