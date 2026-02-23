import { SupabaseClient } from '@supabase/supabase-js';
import { ICourseRepository } from '../../domain/repositories/ICourseRepository';
import { Course } from '../../domain/entities/Course';

export class SupabaseCourseRepository implements ICourseRepository {
    constructor(private readonly db: SupabaseClient) { }

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
        return Course.fromDatabase(data);
    }

    async findByCollegeId(collegeId: string, page?: number, limit?: number): Promise<{ items: Course[], total: number }> {
        let query = this.db
            .from('courses')
            .select('*', { count: 'exact' })
            .eq('college_id', collegeId)
            .order('title');

        if (page && limit) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        return {
            items: (data || []).map(row => Course.fromDatabase(row)),
            total: count || 0
        };
    }

    async findByDepartmentId(departmentId: string, page?: number, limit?: number): Promise<{ items: Course[], total: number }> {
        let query = this.db
            .from('courses')
            .select('*', { count: 'exact' })
            .eq('department_id', departmentId)
            .order('title');

        if (page && limit) {
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        return {
            items: (data || []).map(row => Course.fromDatabase(row)),
            total: count || 0
        };
    }

    async create(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'toJSON'>): Promise<Course> {
        const { data, error } = await this.db
            .from('courses')
            .insert({
                title: course.title,
                code: course.code,
                college_id: course.collegeId,
                department_id: course.departmentId,
                duration_years: course.duration,
                intake: course.intake,
                nature_of_course: course.natureOfCourse,
                is_active: course.isActive
            } as any)
            .select()
            .single();

        if (error) throw error;
        return Course.fromDatabase(data);
    }

    async update(id: string, data: Partial<Course>): Promise<Course> {
        const updateData: any = {};
        if (data.title) updateData.title = data.title;
        if (data.code) updateData.code = data.code;
        if (data.duration !== undefined) updateData.duration_years = data.duration;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;
        if (data.intake !== undefined) updateData.intake = data.intake;
        if (data.natureOfCourse !== undefined) updateData.nature_of_course = data.natureOfCourse;

        const { data: result, error } = await this.db
            .from('courses')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return Course.fromDatabase(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('courses')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}
