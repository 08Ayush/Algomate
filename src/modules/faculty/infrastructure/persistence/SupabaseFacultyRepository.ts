import { SupabaseClient } from '@supabase/supabase-js';
import { IFacultyRepository, IFacultyQualificationRepository } from '../../domain/repositories/IFacultyRepository';
import { Faculty, FacultyQualification } from '../../domain/entities/Faculty';
import { BaseRepository, Database } from '@/shared/database';
import type { UserUpdate } from '@/shared/database/types';
import { withCacheAside } from '@/shared/cache/cache-helper';
import { redisCache } from '@/shared/cache/redis-cache';

export class SupabaseFacultyRepository extends BaseRepository<'users', Faculty> implements IFacultyRepository {
    constructor(db: SupabaseClient<Database>) {
        super(db, 'users');
    }

    private mapToEntity(row: any): Faculty {
        return new Faculty(
            row.id,
            row.id, // user_id is same as id for faculty
            row.department_id,
            row.faculty_type,
            row.specialization || null,
            row.experience || null,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Faculty | null> {
        return withCacheAside({ key: `faculty:id:${id}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('users')
                .select('*')
                .eq('id', id)
                .eq('role', 'faculty')
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null;
                throw error;
            }

            return this.mapToEntity(data);
        });
    }

    async findByUserId(userId: string): Promise<Faculty | null> {
        return this.findById(userId);
    }

    async findByDepartment(departmentId: string): Promise<Faculty[]> {
        return withCacheAside({ key: `faculties:dept:${departmentId}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('users')
                .select('*')
                .eq('department_id', departmentId)
                .eq('role', 'faculty');

            if (error) throw error;
            return data.map(row => this.mapToEntity(row));
        });
    }

    async create(faculty: Omit<Faculty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Faculty> {
        const updatePayload: UserUpdate = {
            department_id: faculty.departmentId,
            faculty_type: faculty.facultyType as UserUpdate['faculty_type'],
            specialization: faculty.specialization,
            experience: faculty.experience,
        };

        const { data, error } = await (this.db as any)
            .from('users')
            .update(updatePayload)
            .eq('id', faculty.userId)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async update(id: string, data: Partial<Faculty>): Promise<Faculty> {
        const updateData: UserUpdate = {};
        if (data.facultyType) updateData.faculty_type = data.facultyType as UserUpdate['faculty_type'];
        if (data.specialization !== undefined) updateData.specialization = data.specialization;
        if (data.experience !== undefined) updateData.experience = data.experience;

        const result = await this.updateRow(id, updateData);
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

    async countByDepartment(departmentId: string): Promise<number> {
        const { count, error } = await this.db
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', departmentId)
            .eq('role', 'faculty');

        if (error) throw error;
        return count || 0;
    }
}

export class SupabaseFacultyQualificationRepository implements IFacultyQualificationRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): FacultyQualification {
        return new FacultyQualification(
            row.id,
            row.faculty_id,
            row.subject_id,
            row.qualification_level,
            row.years_of_experience,
            new Date(row.created_at)
        );
    }

    async findById(id: string): Promise<FacultyQualification | null> {
        return withCacheAside({ key: `faculty_qual:id:${id}`, ttl: 3600 }, async () => {
            const { data, error } = await this.db
                .from('faculty_qualifications' as any)
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

    async findByFaculty(facultyId: string): Promise<FacultyQualification[]> {
        const { data, error } = await this.db
            .from('faculty_qualifications' as any)
            .select('*')
            .eq('faculty_id', facultyId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findBySubject(subjectId: string): Promise<FacultyQualification[]> {
        const { data, error } = await this.db
            .from('faculty_qualifications' as any)
            .select('*')
            .eq('subject_id', subjectId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(qualification: Omit<FacultyQualification, 'id' | 'createdAt'>): Promise<FacultyQualification> {
        const { data, error } = await this.db
            .from('faculty_qualifications' as any)
            .insert({
                faculty_id: qualification.facultyId,
                subject_id: qualification.subjectId,
                qualification_level: qualification.qualificationLevel,
                years_of_experience: qualification.yearsOfExperience
            } as any)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('faculty_qualifications' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
