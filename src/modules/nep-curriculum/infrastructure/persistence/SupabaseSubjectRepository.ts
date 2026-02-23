import { SupabaseClient } from '@supabase/supabase-js';
import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository';
import { Subject } from '../../domain/entities/Subject';
import { Database } from '@/shared/database';
import { withCacheAside } from '@/shared/cache/cache-helper';
import { redisCache } from '@/shared/cache/redis-cache';

export class SupabaseSubjectRepository implements ISubjectRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Subject {
        return new Subject(
            row.id,
            row.name,
            row.code,
            row.credits,
            row.category,
            row.semester,
            row.department_id,
            row.subject_domain || null, // Map from DB
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Subject | null> {
        return withCacheAside({ key: `subject:id:${id}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('nep_subjects' as any)
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

    async findByDepartment(departmentId: string): Promise<Subject[]> {
        return withCacheAside({ key: `subjects:dept:${departmentId}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('nep_subjects' as any)
                .select('*')
                .eq('department_id', departmentId);

            if (error) throw error;
            return data.map(row => this.mapToEntity(row));
        });
    }

    async findBySemester(departmentId: string, semester: number): Promise<Subject[]> {
        return withCacheAside({ key: `subjects:dept:${departmentId}:sem:${semester}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('nep_subjects' as any)
                .select('*')
                .eq('department_id', departmentId)
                .eq('semester', semester);

            if (error) throw error;
            return data.map(row => this.mapToEntity(row));
        });
    }

    async findQualifiedSubjects(facultyId: string): Promise<Subject[]> {
        return withCacheAside({ key: `faculty:qualified_subs:${facultyId}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('faculty_qualified_subjects' as any)
                .select(`
                    subject:nep_subjects (
                        id,
                        name,
                        code,
                        department_id,
                        semester,
                        credits,
                        category,
                        is_active,
                        created_at,
                        updated_at
                    )
                `)
                .eq('faculty_id', facultyId);

            if (error) throw error;

            // Map nested subject data to entity, handling potential nulls
            return (data as any[])
                .map(row => row.subject)
                .filter(Boolean)
                .map(subjectRow => this.mapToEntity(subjectRow));
        });
    }

    async create(subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subject> {
        const { data, error } = await (this.db
            .from('nep_subjects' as any) as any)
            .insert({
                name: subject.name,
                code: subject.code,
                credits: subject.credits,
                category: subject.category,
                semester: subject.semester,
                department_id: subject.departmentId
            })
            .select()
            .single();

        if (error) throw error;

        // Invalidate department and semester lists
        await Promise.all([
            redisCache.del(`subjects:dept:${subject.departmentId}`),
            redisCache.del(`subjects:dept:${subject.departmentId}:sem:${subject.semester}`)
        ]);

        return this.mapToEntity(data);
    }

    async update(id: string, data: Partial<Subject>): Promise<Subject> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.credits) updateData.credits = data.credits;
        if (data.category) updateData.category = data.category;

        const { data: result, error } = await (this.db
            .from('nep_subjects' as any) as any)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (result) {
            await Promise.all([
                redisCache.del(`subject:id:${id}`),
                redisCache.del(`subjects:dept:${result.department_id}`),
                redisCache.del(`subjects:dept:${result.department_id}:sem:${result.semester}`)
            ]);
        }

        return this.mapToEntity(result);
    }

    async delete(id: string): Promise<boolean> {
        // Fetch first to know which caches to invalidate
        const item = await this.findById(id);

        const { error } = await this.db
            .from('nep_subjects' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (item) {
            await Promise.all([
                redisCache.del(`subject:id:${id}`),
                redisCache.del(`subjects:dept:${item.departmentId}`),
                redisCache.del(`subjects:dept:${item.departmentId}:sem:${item.semester}`)
            ]);
        }

        return true;
    }
}
