import { SupabaseClient } from '@supabase/supabase-js';
import { ITimetableRepository, IScheduledClassRepository } from '../../domain/repositories/ITimetableRepository';
import { Timetable, ScheduledClass } from '../../domain/entities/Timetable';
import { Database } from '@/shared/database';

export class SupabaseTimetableRepository implements ITimetableRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Timetable {
        return new Timetable(
            row.id,
            row.department_id,
            row.batch_id,
            row.college_id,
            row.semester,
            row.academic_year,
            row.fitness_score || 0,
            row.constraint_violations || [],
            row.generation_method || 'HYBRID',
            row.status,
            row.created_by,
            row.published_at ? new Date(row.published_at) : null,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Timetable | null> {
        const { data, error } = await this.db
            .from('generated_timetables' as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }

    async findByDepartment(departmentId: string): Promise<Timetable[]> {
        const { data, error } = await this.db
            .from('generated_timetables' as any)
            .select('*')
            .eq('department_id', departmentId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findByBatch(batchId: string): Promise<Timetable[]> {
        const { data, error } = await this.db
            .from('generated_timetables' as any)
            .select('*')
            .eq('batch_id', batchId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(timetable: Omit<Timetable, 'id' | 'createdAt' | 'updatedAt'>): Promise<Timetable> {
        const { data, error } = await (this.db
            .from('generated_timetables' as any) as any)
            .insert({
                department_id: timetable.departmentId,
                batch_id: timetable.batchId,
                college_id: timetable.collegeId,
                semester: timetable.semester,
                academic_year: timetable.academicYear,
                fitness_score: timetable.fitnessScore,
                constraint_violations: timetable.constraintViolations,
                generation_method: timetable.generationMethod,
                status: timetable.status,
                created_by: timetable.createdBy,
                published_at: timetable.publishedAt
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async createTask(task: any): Promise<any> {
        const { data, error } = await (this.db
            .from('timetable_generation_tasks' as any) as any)
            .insert(task)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id: string, data: Partial<Timetable>): Promise<Timetable> {
        const updateData: any = {};
        if (data.status) updateData.status = data.status;
        if (data.publishedAt !== undefined) updateData.published_at = data.publishedAt;

        const { data: result, error } = await this.db
            .from('generated_timetables' as any)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('generated_timetables' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async publish(id: string): Promise<Timetable> {
        const { data, error } = await this.db
            .from('generated_timetables' as any)
            .update({
                status: 'published',
                published_at: new Date().toISOString()
            } as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async updateStatus(id: string, status: 'draft' | 'pending_approval' | 'published' | 'rejected'): Promise<Timetable> {
        const { data, error } = await this.db
            .from('generated_timetables' as any)
            .update({ status } as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async logWorkflowAction(timetableId: string, action: string, performedBy: string, comments?: string): Promise<void> {
        const { error } = await this.db
            .from('workflow_approvals' as any)
            .insert({
                timetable_id: timetableId,
                workflow_step: action,
                performed_by: performedBy,
                comments: comments || '',
                approval_level: 'creator'
            } as any);

        if (error) {
            console.error('Error logging workflow action:', error);
        }
    }
}

export class SupabaseScheduledClassRepository implements IScheduledClassRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): ScheduledClass {
        return new ScheduledClass(
            row.id,
            row.timetable_id,
            row.subject_id,
            row.faculty_id,
            row.classroom_id,
            row.day_of_week,
            row.start_time,
            row.end_time,
            row.is_lab || false,
            row.session_duration || 60,
            row.class_type || 'THEORY',
            row.credit_hour_number || 1,
            new Date(row.created_at)
        );
    }

    async findById(id: string): Promise<ScheduledClass | null> {
        const { data, error } = await this.db
            .from('scheduled_classes' as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }

    async findByTimetable(timetableId: string): Promise<ScheduledClass[]> {
        const { data, error } = await this.db
            .from('scheduled_classes' as any)
            .select('*')
            .eq('timetable_id', timetableId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(scheduledClass: Omit<ScheduledClass, 'id' | 'createdAt'>): Promise<ScheduledClass> {
        const { data, error } = await (this.db
            .from('scheduled_classes' as any) as any)
            .insert({
                timetable_id: scheduledClass.timetableId,
                subject_id: scheduledClass.subjectId,
                faculty_id: scheduledClass.facultyId,
                classroom_id: scheduledClass.classroomId,
                day_of_week: scheduledClass.dayOfWeek,
                start_time: scheduledClass.startTime,
                end_time: scheduledClass.endTime,
                is_lab: scheduledClass.isLab,
                session_duration: scheduledClass.sessionDuration,
                class_type: scheduledClass.classType,
                credit_hour_number: scheduledClass.creditHourNumber
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async createMany(scheduledClasses: Omit<ScheduledClass, 'id' | 'createdAt'>[]): Promise<ScheduledClass[]> {
        const { data, error } = await (this.db
            .from('scheduled_classes' as any) as any)
            .insert(scheduledClasses.map(sc => ({
                timetable_id: sc.timetableId,
                subject_id: sc.subjectId,
                faculty_id: sc.facultyId,
                classroom_id: sc.classroomId,
                day_of_week: sc.dayOfWeek,
                start_time: sc.startTime,
                end_time: sc.endTime,
                is_lab: sc.isLab,
                session_duration: sc.sessionDuration,
                class_type: sc.classType,
                credit_hour_number: sc.creditHourNumber
            })))
            .select();

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('scheduled_classes' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async deleteByTimetable(timetableId: string): Promise<boolean> {
        const { error } = await this.db
            .from('scheduled_classes' as any)
            .delete()
            .eq('timetable_id', timetableId);

        if (error) throw error;
        return true;
    }

    async updateStatus(id: string, status: 'draft' | 'pending_approval' | 'published' | 'rejected'): Promise<Timetable> {
        const { data, error } = await this.db
            .from('generated_timetables' as any)
            .update({ status } as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async logWorkflowAction(timetableId: string, action: string, performedBy: string, comments?: string): Promise<void> {
        const { error } = await this.db
            .from('workflow_approvals' as any)
            .insert({
                timetable_id: timetableId,
                workflow_step: action,
                performed_by: performedBy,
                comments: comments || '',
                approval_level: 'creator' // Default level
            } as any);

        if (error) {
            console.error('Error logging workflow action:', error);
            // Don't throw - workflow logging is not critical
        }
    }
}
