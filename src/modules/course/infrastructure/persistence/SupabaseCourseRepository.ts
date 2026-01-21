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

    async findByCollegeId(collegeId: string): Promise<Course[]> {
        const { data, error } = await this.db
            .from('courses')
            .select('*')
            .eq('college_id', collegeId)
            .order('title');

        if (error) throw error;
        return (data || []).map(row => Course.fromDatabase(row));
    }

    async findByDepartmentId(departmentId: string): Promise<Course[]> {
        const { data, error } = await this.db
            .from('courses')
            .select('*')
            .eq('department_id', departmentId)
            .order('title');

        if (error) throw error;
        return (data || []).map(row => Course.fromDatabase(row));
    }

    async create(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course> {
        const { data, error } = await this.db
            .from('courses')
            .insert({
                title: course.title,
                code: course.code,
                college_id: course.collegeId,
                department_id: course.departmentId,
                duration: course.duration,
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
        if (data.duration !== undefined) updateData.duration = data.duration;
        if (data.isActive !== undefined) updateData.is_active = data.isActive;

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
