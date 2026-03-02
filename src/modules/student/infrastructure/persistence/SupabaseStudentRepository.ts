import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { IStudentRepository, IBatchRepository, CreateStudentData, CreateBatchData } from '../../domain/repositories/IStudentRepository';
import { Student, Batch } from '../../domain/entities/Student';
import { Database } from '@/shared/database';
import { withCacheAside } from '@/shared/cache/cache-helper';

export class SupabaseStudentRepository implements IStudentRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Student {
        return new Student(
            row.id,
            row.id,
            row.batch_id || '',
            row.roll_number || '',
            row.enrollment_year || new Date().getFullYear(),
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Student | null> {
        return withCacheAside({ key: `student:id:${id}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('users')
                .select('*')
                .eq('id', id)
                .eq('role', 'student')
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            return this.mapToEntity(data);
        });
    }

    async findByUserId(userId: string): Promise<Student | null> {
        return this.findById(userId);
    }

    async findByBatch(batchId: string): Promise<Student[]> {
        return withCacheAside({ key: `students:batch:${batchId}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('users')
                .select('*')
                .eq('role', 'student')
                .eq('batch_id', batchId); // Added the missing filter match

            if (error) throw error;
            return data.map(row => this.mapToEntity(row));
        });
    }

    async create(student: CreateStudentData): Promise<Student> {
        const { data, error } = await (this.db as any)
            .from('users')
            .update({
                roll_number: student.rollNumber,
                enrollment_year: student.enrollmentYear
            })
            .eq('id', student.userId)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async update(id: string, data: Partial<Student>): Promise<Student> {
        const updateData: any = {};
        if (data.rollNumber) updateData.roll_number = data.rollNumber;
        if (data.enrollmentYear) updateData.enrollment_year = data.enrollmentYear;

        const { data: result, error } = await (this.db as any)
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async countByBatch(batchId: string): Promise<number> {
        const { count, error } = await this.db
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');

        if (error) throw error;
        return count || 0;
    }
}

export class SupabaseBatchRepository implements IBatchRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Batch {
        return new Batch(
            row.id,
            row.name,
            row.department_id,
            row.year,
            row.semester,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Batch | null> {
        return withCacheAside({ key: `batch:id:${id}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('batches')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            return this.mapToEntity(data);
        });
    }

    async findByDepartment(departmentId: string): Promise<Batch[]> {
        return withCacheAside({ key: `batches:dept:${departmentId}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('batches')
                .select('*')
                .eq('department_id', departmentId);

            if (error) throw error;
            return data.map(row => this.mapToEntity(row));
        });
    }

    async create(batch: CreateBatchData): Promise<Batch> {
        const { data, error } = await (this.db as any)
            .from('batches')
            .insert({
                name: batch.name,
                department_id: batch.departmentId,
                year: batch.year,
                semester: batch.semester
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async update(id: string, data: Partial<Batch>): Promise<Batch> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.year) updateData.year = data.year;
        if (data.semester) updateData.semester = data.semester;

        const { data: result, error } = await (this.db as any)
            .from('batches')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('batches')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
