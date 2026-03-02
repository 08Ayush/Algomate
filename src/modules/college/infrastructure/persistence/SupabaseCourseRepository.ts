import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { ICourseRepository } from '../../domain/repositories/ICourseRepository';
import { Course } from '../../domain/entities/Course';
import { Database } from '@/shared/database';

export class SupabaseCourseRepository implements ICourseRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Course {
        return new Course(
            row.id,
            row.title,
            row.code,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Course | null> {
        const { data, error } = await this.db
            .from('courses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return this.mapToEntity(data);
    }

    async findAll(): Promise<Course[]> {
        const { data, error } = await this.db
            .from('courses')
            .select('*');

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findByCollege(collegeId: string): Promise<Course[]> {
        const { data, error } = await this.db
            .from('courses')
            .select('*')
            .eq('college_id', collegeId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }
}
