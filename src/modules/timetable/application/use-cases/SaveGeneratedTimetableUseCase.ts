import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { SaveGeneratedTimetableDto } from '../dto/SaveGeneratedTimetableDto';

export class SaveGeneratedTimetableUseCase {
    constructor(private readonly supabase: SupabaseClient) { }

    async execute(dto: SaveGeneratedTimetableDto) {
        let {
            title,
            semester,
            department_id,
            college_id,
            batch_id,
            academic_year,
            schedule,
            created_by,
            status = 'draft'
        } = dto;

        // If batch_id not provided, try to find or create one
        if (!batch_id) {
            // Logic duplicated from original route for now to ensure behavior parity
            // Ideally should use BatchRepository
            if (!department_id || !college_id) {
                const { data: userData } = await this.supabase
                    .from('users')
                    .select('department_id, college_id')
                    .eq('id', created_by)
                    .single();

                if (userData) {
                    department_id = department_id || userData.department_id;
                    college_id = college_id || userData.college_id as string;
                }
            }

            if (department_id && college_id) {
                const { data: existingBatch } = await this.supabase
                    .from('batches')
                    .select('id')
                    .eq('department_id', department_id)
                    .eq('semester', semester)
                    .eq('academic_year', academic_year)
                    .eq('is_active', true)
                    .limit(1)
                    .single();

                if (existingBatch) {
                    batch_id = existingBatch.id;
                } else {
                    const { data: newBatch } = await this.supabase
                        .from('batches')
                        .insert({
                            name: `Semester ${semester} - ${academic_year}`,
                            department_id: department_id,
                            college_id: college_id,
                            semester: semester,
                            academic_year: academic_year,
                            section: 'A',
                            expected_strength: 60,
                            actual_strength: 60,
                            is_active: true
                        } as any)
                        .select('id')
                        .single();
                    if (newBatch) batch_id = newBatch.id;
                }
            }
        }

        if (!batch_id) {
            throw new Error('Could not determine batch. Please provide batch_id or ensure department and college are set.');
        }

        // Ensure college_id is resolved — fall back to batch's college if still missing
        if (!college_id) {
            const { data: batchData } = await this.supabase
                .from('batches')
                .select('college_id')
                .eq('id', batch_id)
                .single();
            if (batchData) college_id = batchData.college_id;
        }

        if (!college_id) {
            throw new Error('Could not determine college_id. Please ensure user has a college assigned.');
        }

        // Cleanup existing drafts
        const { data: existingDrafts } = await this.supabase
            .from('generated_timetables')
            .select('id')
            .eq('batch_id', batch_id)
            .eq('status', 'draft')
            .eq('semester', semester)
            .eq('academic_year', academic_year);

        if (existingDrafts && existingDrafts.length > 0) {
            for (const draft of existingDrafts) {
                await this.supabase.from('scheduled_classes').delete().eq('timetable_id', draft.id);
                await this.supabase.from('generated_timetables').delete().eq('id', draft.id);
            }
        }

        // Create Task
        const { data: task, error: taskError } = await this.supabase
            .from('timetable_generation_tasks')
            .insert({
                task_name: title || `AI Timetable - Semester ${semester}`,
                batch_id: batch_id,
                academic_year: academic_year,
                semester: semester,
                status: 'COMPLETED',
                current_phase: 'COMPLETED',
                progress: 100,
                current_message: 'AI timetable generation completed',
                algorithm_config: { method: 'ai_generation', created_at: new Date().toISOString() },
                created_by: created_by,
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                solutions_generated: 1,
                best_fitness_score: 0.85,
                execution_time_seconds: 5
            } as any)
            .select()
            .single();

        if (taskError) throw taskError;

        // Create Timetable
        const { data: timetable, error: timetableError } = await this.supabase
            .from('generated_timetables')
            .insert({
                generation_task_id: task.id,
                title: title || `Semester ${semester} Timetable - ${academic_year}`,
                batch_id: batch_id,
                college_id: college_id,
                academic_year: academic_year,
                semester: semester,
                status: status,
                fitness_score: 0.85,
                constraint_violations: [],
                optimization_metrics: { method: 'ai_generation', total_assignments: schedule.length, created_at: new Date().toISOString() },
                generation_method: 'HYBRID',
                created_by: created_by,
                version: 1
            } as any)
            .select()
            .single();

        if (timetableError) {
            await this.supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
            throw timetableError;
        }

        // Fetch Time Slots
        const { data: timeSlots } = await this.supabase
            .from('time_slots')
            .select('*')
            .eq('college_id', college_id || dto.college_id)
            .eq('is_active', true);

        const timeSlotMap = new Map();
        timeSlots?.forEach((slot: any) => {
            const startTime = slot.start_time.substring(0, 5);
            const key = `${slot.day}-${startTime}`;
            timeSlotMap.set(key, slot.id);
        });

        // Insert Classes
        const scheduledClasses = schedule.map((item: any, index: number) => {
            const timeKey = `${item.day}-${item.time}`;
            const timeSlotId = timeSlotMap.get(timeKey);
            const isLabClass = item.is_lab || item.subject_type?.toLowerCase().includes('lab') || (item.duration && item.duration > 1);

            return {
                timetable_id: timetable.id,
                batch_id: batch_id,
                subject_id: item.subject_id,
                faculty_id: item.faculty_id,
                classroom_id: item.classroom_id || null,
                time_slot_id: timeSlotId || null, // Allow null to enable filtering later
                credit_hour_number: index + 1,
                class_type: isLabClass ? 'LAB' : (item.subject_type || 'THEORY'),
                session_duration: (item.duration || 1) * 60,
                is_recurring: true,
                is_lab: isLabClass,
                is_continuation: item.is_continuation || false,
                session_number: item.session_number || 1,
                notes: item.is_continuation
                    ? `${item.subject_name || 'Class'} (Continuation) - ${item.faculty_name || 'Faculty'}`
                    : `${item.subject_name || 'Class'} - ${item.faculty_name || 'Faculty'}${item.duration === 2 ? ' (2-hour session)' : ''}`
            };
        });

        const validClasses = scheduledClasses.filter((c: any) => c.time_slot_id !== null);

        // Remove duplicates
        const uniqueClasses = validClasses.filter((cls: any, index: number, self: any[]) => {
            const firstIndex = self.findIndex(c => c.batch_id === cls.batch_id && c.time_slot_id === cls.time_slot_id);
            return firstIndex === index;
        });

        if (uniqueClasses.length > 0) {
            const { error: classesError } = await this.supabase
                .from('scheduled_classes')
                .insert(uniqueClasses as any);

            if (classesError) {
                await this.supabase.from('generated_timetables').delete().eq('id', timetable.id);
                await this.supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
                throw classesError;
            }
        }

        // Workflow Approval
        await this.supabase.from('workflow_approvals').insert({
            timetable_id: timetable.id,
            workflow_step: 'created',
            performed_by: created_by,
            comments: 'AI-generated timetable created',
            approval_level: 'creator'
        } as any);

        return {
            timetable_id: timetable.id,
            title: timetable.title,
            status: timetable.status,
            batch_id: timetable.batch_id,
            task_id: task.id,
            classes_created: uniqueClasses.length,
            message: 'Timetable saved successfully'
        };
    }
}
