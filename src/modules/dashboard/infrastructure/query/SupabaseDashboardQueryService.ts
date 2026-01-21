import { SupabaseClient } from '@supabase/supabase-js';
import { IDashboardQueryService } from '../../domain/ports/IDashboardQueryService';
import { DashboardStats, RecentActivity, RecentTimetable } from '../../domain/entities/DashboardTypes';

export class SupabaseDashboardQueryService implements IDashboardQueryService {
    constructor(private readonly supabase: SupabaseClient) { }

    async getFacultyStats(userId: string, departmentId: string, facultyType: string): Promise<DashboardStats> {
        let timetablesQuery = this.supabase
            .from('generated_timetables')
            .select('id, status, fitness_score, constraint_violations, batch_id, batches!inner(department_id)');

        if (facultyType === 'creator') {
            timetablesQuery = timetablesQuery.eq('created_by', userId);
        } else if (facultyType === 'publisher' && departmentId) {
            timetablesQuery = timetablesQuery.eq('batches.department_id', departmentId);
        }

        const [
            { data: timetables },
            { count: facultyCount },
            { data: tasks },
            { data: classrooms }
        ] = await Promise.all([
            timetablesQuery,
            this.supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('department_id', departmentId)
                .eq('role', 'faculty')
                .eq('is_active', true),
            this.supabase
                .from('timetable_generation_tasks')
                .select('execution_time_seconds')
                .eq('created_by', userId)
                .eq('status', 'COMPLETED')
                .order('created_at', { ascending: false })
                .limit(10),
            this.supabase
                .from('classrooms')
                .select('id')
                .eq('department_id', departmentId)
                .eq('is_available', true)
        ]);

        const activeTimetables = timetables?.filter((t: any) => t.status === 'published')?.length || 0;
        const validFitnessScores = timetables?.filter((t: any) => t.fitness_score && t.fitness_score > 0).map((t: any) => t.fitness_score) || [];
        const avgFitnessScore = validFitnessScores.length > 0
            ? validFitnessScores.reduce((a: number, b: number) => a + b, 0) / validFitnessScores.length
            : 0;

        const avgTime = tasks && tasks.length > 0
            ? tasks.reduce((sum: number, t: any) => sum + (t.execution_time_seconds || 0), 0) / tasks.length
            : 0;
        const avgGenerationTime = avgTime > 0 ? `${avgTime.toFixed(1)}s` : '0s';

        const timetablesWithViolations = timetables?.filter((t: any) =>
            t.constraint_violations && Array.isArray(t.constraint_violations) && t.constraint_violations.length > 0
        ).length || 0;
        const totalTimetables = timetables?.length || 0;
        const conflictResolutionRate = totalTimetables > 0
            ? ((totalTimetables - timetablesWithViolations) / totalTimetables) * 100
            : 0;

        let totalClasses = 0;
        let usedClassrooms = 0;
        const timetableIds = timetables?.map((t: any) => t.id) || [];
        const classroomIds = classrooms?.map((c: any) => c.id) || [];

        if (timetableIds.length > 0) {
            const [
                { count: classCount },
                { data: usedRooms }
            ] = await Promise.all([
                this.supabase
                    .from('scheduled_classes')
                    .select('*', { count: 'exact', head: true })
                    .in('timetable_id', timetableIds),
                classroomIds.length > 0
                    ? this.supabase
                        .from('scheduled_classes')
                        .select('classroom_id')
                        .in('timetable_id', timetableIds)
                        .in('classroom_id', classroomIds)
                    : Promise.resolve({ data: [] })
            ]);
            totalClasses = classCount || 0;
            const uniqueRooms = new Set(usedRooms?.map((r: any) => r.classroom_id) || []);
            usedClassrooms = uniqueRooms.size;
        }

        const roomUtilization = classroomIds.length > 0 && usedClassrooms
            ? (usedClassrooms / classroomIds.length) * 100
            : 0;

        return {
            activeTimetables,
            avgFitnessScore: Math.round(avgFitnessScore),
            facultyCount: facultyCount || 0,
            avgGenerationTime,
            totalClassesScheduled: totalClasses,
            conflictResolutionRate: Math.round(conflictResolutionRate * 10) / 10,
            roomUtilization: Math.round(roomUtilization),
            facultySatisfaction: avgFitnessScore > 0 ? Math.round((avgFitnessScore / 100) * 50) / 10 : 0
        };
    }

    async getRecentTimetables(userId: string, departmentId: string, facultyType: string): Promise<RecentTimetable[]> {
        let query = this.supabase
            .from('generated_timetables')
            .select('id, title, status, created_at, batch_id, batches!inner(name, department_id)')
            .order('created_at', { ascending: false })
            .limit(5);

        if (facultyType === 'creator') {
            query = query.eq('created_by', userId);
        } else if (facultyType === 'publisher' && departmentId) {
            query = query.eq('batches.department_id', departmentId);
        }

        const { data } = await query;

        return data?.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            created_at: t.created_at,
            batch_name: (t.batches as any)?.name || 'Unknown Batch'
        })) || [];
    }

    async getRecentActivities(userId: string): Promise<RecentActivity[]> {
        const { data: notifications } = await this.supabase
            .from('notifications')
            .select('*')
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        return notifications?.map((n: any) => ({
            id: n.id,
            type: n.type === 'timetable_published' ? 'timetable_published' :
                n.type === 'approval_request' ? 'modification_request' : 'optimization_completed',
            title: n.title || 'Notification',
            description: n.message || '',
            created_at: n.created_at
        })) || [];
    }

    async getPendingReviewCount(userId: string, departmentId: string, facultyType: string): Promise<number> {
        if (facultyType !== 'publisher' || !departmentId) return 0;

        const { data: batches } = await this.supabase
            .from('batches')
            .select('id')
            .eq('department_id', departmentId);

        const batchIds = batches?.map((b: any) => b.id) || [];
        if (batchIds.length === 0) return 0;

        const { count } = await this.supabase
            .from('generated_timetables')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending_approval')
            .in('batch_id', batchIds);

        return count || 0;
    }

    async getStudentDashboardData(userId: string, courseId: string, semester: number, collegeId: string): Promise<any> {
        const additionalData: any = {};

        // Fetch batch, faculty, and course batches
        const [
            { data: batchData },
            { data: facultyMembers },
            { data: courseBatches }
        ] = await Promise.all([
            this.supabase
                .from('batches')
                .select(`
            id,
            name,
            section,
            semester,
            academic_year,
            actual_strength,
            course_id,
            department_id,
            course:courses!course_id (
              code
            ),
            departments:departments!batches_department_id_fkey (
              id,
              name,
              code
            )
          `)
                .eq('college_id', collegeId)
                .eq('course_id', courseId)
                .eq('semester', semester)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle(),
            this.supabase
                .from('users')
                .select(`
            id,
            first_name,
            last_name,
            email,
            college_uid,
            faculty_type,
            department_id,
            departments:departments!users_department_id_fkey (
              name,
              code
            )
          `)
                .eq('course_id', courseId)
                .eq('role', 'faculty')
                .eq('is_active', true)
                .order('first_name'),
            this.supabase
                .from('batches')
                .select('id, department_id')
                .eq('course_id', courseId)
                .eq('is_active', true)
        ]);

        if (batchData) {
            additionalData.batch = batchData;
            additionalData.batchId = batchData.id;
        }

        additionalData.facultyMembers = facultyMembers || [];
        additionalData.facultyCount = facultyMembers?.length || 0;

        const departmentIds = [...new Set((courseBatches ?? []).map((b: any) => b.department_id).filter(Boolean))];

        if (departmentIds.length > 0) {
            const { data: eventsData } = await this.supabase
                .from('events')
                .select(`
            id,
            title,
            description,
            event_type,
            event_date,
            event_time,
            end_time,
            location,
            status,
            created_by,
            creator:users!events_created_by_fkey (
              first_name,
              last_name,
              faculty_type
            )
          `)
                .in('department_id', departmentIds)
                .in('status', ['draft', 'published'])
                .order('event_date', { ascending: false })
                .limit(10);

            additionalData.events = (eventsData || []).map((event: any) => ({
                ...event,
                creator: Array.isArray(event.creator) ? event.creator[0] || null : event.creator,
                start_date: event.event_date,
                start_time: event.event_time,
                venue: event.location
            }));
        }

        return additionalData;
    }
}
