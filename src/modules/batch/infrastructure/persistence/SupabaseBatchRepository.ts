import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { IBatchRepository, CreateBatchData } from '../../domain/repositories/IBatchRepository';
import { Batch } from '../../domain/entities/Batch';

export class SupabaseBatchRepository implements IBatchRepository {
    constructor(private readonly db: SupabaseClient) { }

    async findById(id: string): Promise<Batch | null> {
        const { data, error } = await this.db
            .from('batches')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return Batch.fromDatabase(data);
    }

    async findByCollegeId(collegeId: string): Promise<Batch[]> {
        const { data, error } = await this.db
            .from('batches')
            .select('*')
            .eq('college_id', collegeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((row: any) => Batch.fromDatabase(row));
    }

    async findByDepartmentId(departmentId: string): Promise<Batch[]> {
        const { data, error } = await this.db
            .from('batches')
            .select('*')
            .eq('department_id', departmentId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((row: any) => Batch.fromDatabase(row));
    }

    async create(batch: CreateBatchData): Promise<Batch> {
        const { data, error } = await this.db
            .from('batches')
            .insert({
                name: batch.name,
                college_id: batch.collegeId,
                department_id: batch.departmentId,
                course_id: batch.courseId,
                semester: batch.semester,
                section: batch.section,
                academic_year: batch.academicYear,
                is_active: batch.isActive
            } as any)
            .select()
            .single();

        if (error) throw error;
        return Batch.fromDatabase(data);
    }

    async update(id: string, data: Partial<Batch>): Promise<Batch> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.semester !== undefined) updateData.semester = data.semester;
        if (data.section) updateData.section = data.section;
        if (data.academicYear) updateData.academic_year = data.academicYear;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;

        const { data: result, error } = await this.db
            .from('batches')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return Batch.fromDatabase(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('batches')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async promoteBatch(batchId: string): Promise<Batch> {
        // Get current batch
        const batch = await this.findById(batchId);
        if (!batch) {
            throw new Error('Batch not found');
        }

        // Increment semester
        const newSemester = batch.semester + 1;

        // Update batch
        return this.update(batchId, { semester: newSemester });
    }
}
