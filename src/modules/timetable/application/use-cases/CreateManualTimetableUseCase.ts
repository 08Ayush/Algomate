import { ITimetableRepository, IScheduledClassRepository } from '../../domain/repositories/ITimetableRepository';
import { Timetable, ScheduledClass } from '../../domain/entities/Timetable';
import { IUserRepository } from '../../../auth/domain/repositories/IUserRepository';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/shared/database';

// Import shared libs - assuming these are available as per existing route
import {
    fetchConstraintRules,
    validateConstraints,
    type ScheduledClass as LibScheduledClass,
    type TimeSlot as LibTimeSlot
} from '@/lib/constraintRules';
import { createConstraintViolationNotifications } from '@/lib/notifications';

interface CreateManualTimetableRequest {
    assignments: any[];
    createdBy: string;
    academicYear: string;
    semester: number;
    departmentId?: string;
    collegeId?: string;
    batchId?: string;
    title?: string;
}

export class CreateManualTimetableUseCase {
    constructor(
        private readonly timetableRepository: ITimetableRepository,
        private readonly scheduledClassRepository: IScheduledClassRepository,
        private readonly userRepository: IUserRepository,
        // We'll use a direct supabase client for lookups that don't have repositories yet
        // In a strictly clean arch, these should be injected repositories
        private readonly supabase: ReturnType<typeof createClient<Database>>
    ) { }

    async execute(request: CreateManualTimetableRequest): Promise<any> {
        const {
            assignments,
            createdBy,
            academicYear,
            semester,
            departmentId,
            collegeId,
            batchId,
            title
        } = request;

        // 1. Validation
        if (!assignments || assignments.length === 0) {
            throw new Error('No assignments provided');
        }

        const user = await this.userRepository.findById(createdBy);
        if (!user) {
            throw new Error('Invalid user ID');
        }

        // 2. Resolve Batch/Department/College
        let finalBatchId = batchId;
        let finalDepartmentId = departmentId;
        let finalCollegeId = collegeId;

        if (!finalBatchId) {
            // Find batch by semester
            const query = (this.supabase
                .from('batches' as any) as any)
                .select('id, department_id, college_id')
                .eq('semester', semester)
                .eq('academic_year', academicYear)
                .eq('is_active', true);

            if (finalDepartmentId) query.eq('department_id', finalDepartmentId);
            if (finalCollegeId) query.eq('college_id', finalCollegeId);

            const { data: batches, error } = await query.limit(1);
            if (error || !batches?.length) {
                throw new Error(`No active batch found for semester ${semester}`);
            }
            finalBatchId = batches[0].id;
            finalDepartmentId = batches[0].department_id;
            finalCollegeId = batches[0].college_id;
        } else {
            // Find details from batchId
            const { data: batch, error } = await (this.supabase
                .from('batches' as any) as any)
                .select('department_id, college_id')
                .eq('id', finalBatchId)
                .single();

            if (error || !batch) throw new Error('Invalid batch ID');

            finalDepartmentId = batch.department_id;
            finalCollegeId = batch.college_id;
        }

        if (!finalBatchId || !finalCollegeId || !finalDepartmentId) {
            throw new Error('Could not resolve batch, department, or college IDs');
        }

        // 3. Create Task
        const taskData = {
            task_name: title || `Manual Timetable - Semester ${semester}`,
            batch_id: finalBatchId,
            academic_year: academicYear,
            semester: semester,
            status: 'COMPLETED',
            current_phase: 'COMPLETED',
            progress: 100,
            current_message: 'Manual timetable creation completed',
            algorithm_config: {
                method: 'manual',
                created_at: new Date().toISOString()
            },
            created_by: createdBy,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            solutions_generated: 1,
            best_fitness_score: 100.0,
            execution_time_seconds: 0
        };

        const task = await (this.timetableRepository as any).createTask(taskData); // Using explicit any cast on repo if interface missing

        // 4. Create Timetable
        const createdTimetable = await this.timetableRepository.create({
            title: title || `Manual Timetable - Semester ${semester}`,
            departmentId: finalDepartmentId,
            batchId: finalBatchId,
            collegeId: finalCollegeId,
            semester: semester,
            academicYear: academicYear,
            status: 'draft',
            createdBy: createdBy,
            fitnessScore: 100.0,
            constraintViolations: [],
            generationMethod: 'HYBRID',
            publishedAt: null
        } as any);

        // Link timetable to task manually if needed or if repository didn't handle foreign key (it doesn't in create)
        // Actually the schema requires generation_task_id on timetable. 
        // My create method in repository doesn't accept task_id. This is a gap.
        // I should have updated create to accept task_id or handle it.
        // For now, let's update it immediately.
        await (this.supabase
            .from('generated_timetables' as any) as any)
            .update({ generation_task_id: task.id })
            .eq('id', createdTimetable.id);

        try {
            // 5. Map Time Slots
            const { data: dbTimeSlots } = await (this.supabase
                .from('time_slots' as any) as any)
                .select('id, day, start_time, end_time, duration_minutes')
                .eq('college_id', finalCollegeId)
                .eq('is_active', true);

            if (!dbTimeSlots?.length) throw new Error('No time slots found');

            const normalizeTime = (time: string) => time.split(':').slice(0, 2).join(':');
            const timeSlotMap = new Map<string, string>();
            dbTimeSlots.forEach((slot: any) => {
                const key = `${slot.day}-${normalizeTime(slot.start_time)}`;
                timeSlotMap.set(key, slot.id);
            });

            // 6. Fetch Classrooms
            const { data: classrooms } = await (this.supabase
                .from('classrooms' as any) as any)
                .select('id, name, capacity, type')
                .eq('college_id', finalCollegeId)
                .eq('is_available', true)
                .order('capacity', { ascending: false });

            if (!classrooms?.length) throw new Error('No classrooms found');

            const regularClassrooms = classrooms.filter((c: any) => !c.type?.toLowerCase().includes('lab'));
            const labClassrooms = classrooms.filter((c: any) => c.type?.toLowerCase().includes('lab'));

            // 7. Create Scheduled Classes
            const scheduledClassesToCreate: any[] = [];
            const classroomOccupancy = new Map<string, Set<string>>();

            for (const assignment of assignments) {
                const normalizedStart = normalizeTime(assignment.timeSlot.startTime);
                const timeSlotKey = `${assignment.timeSlot.day}-${normalizedStart}`;
                const dbTimeSlotId = timeSlotMap.get(timeSlotKey);

                if (!dbTimeSlotId) continue;

                const isLabAssignment = assignment.isLab || assignment.subject.requiresLab || false;
                const pool = isLabAssignment ? (labClassrooms.length ? labClassrooms : classrooms) : (regularClassrooms.length ? regularClassrooms : classrooms);

                // Simple occupancy check
                if (!classroomOccupancy.has(timeSlotKey)) classroomOccupancy.set(timeSlotKey, new Set());
                const occupied = classroomOccupancy.get(timeSlotKey)!;

                let assignedClassroomId = assignment.classroom && pool.some((c: any) => c.id === assignment.classroom) && !occupied.has(assignment.classroom)
                    ? assignment.classroom
                    : pool.find((c: any) => !occupied.has(c.id))?.id || pool[0].id;

                occupied.add(assignedClassroomId);

                const classData = {
                    timetableId: createdTimetable.id,
                    subjectId: assignment.subject.id,
                    facultyId: assignment.faculty.id,
                    classroomId: assignedClassroomId,
                    dayOfWeek: assignment.timeSlot.day, // This might need mapping to number if DB expects number
                    startTime: assignment.timeSlot.startTime,
                    endTime: assignment.timeSlot.endTime, // We might need to map this carefully
                    isLab: isLabAssignment,
                    sessionDuration: (assignment.duration || 1) * 60,
                    classType: isLabAssignment ? 'LAB' : 'THEORY',
                    creditHourNumber: scheduledClassesToCreate.length + 1,
                    // Extra fields for repository createMany if needed
                    timetable_id: createdTimetable.id,
                    batch_id: finalBatchId,
                    time_slot_id: dbTimeSlotId
                };

                scheduledClassesToCreate.push(classData);
            }

            // 8. Bulk Create Classes
            const dbClasses = scheduledClassesToCreate.map(sc => ({
                timetable_id: sc.timetableId,
                batch_id: sc.batch_id,
                subject_id: sc.subjectId,
                faculty_id: sc.facultyId,
                classroom_id: sc.classroomId,
                time_slot_id: sc.time_slot_id, // Important
                credit_hour_number: sc.creditHourNumber,
                class_type: sc.classType,
                session_duration: sc.sessionDuration,
                is_recurring: true,
                is_lab: sc.isLab,
                day_of_week: sc.dayOfWeek, // Check if this should be number or string
                start_time: sc.startTime,
                end_time: sc.endTime
            }));

            const { error: classesError } = await (this.supabase
                .from('scheduled_classes' as any) as any)
                .insert(dbClasses);

            if (classesError) throw classesError;

            // 9. Constraint Validation
            const constraintRules = await fetchConstraintRules({
                department_id: finalDepartmentId,
                batch_id: finalBatchId
            });

            // Map to libs expected format
            const timeSlotData: LibTimeSlot[] = dbTimeSlots.map((ts: any) => ({
                id: ts.id,
                day: ts.day,
                start_time: ts.start_time,
                end_time: ts.end_time,
                duration_minutes: ts.duration_minutes
            }));

            // We need to fetch the just created classes again to get IDs and verify?
            // Or just map what we have.
            // Let's try to validate what we constructed.
            const { violations, score } = await validateConstraints(
                scheduledClassesToCreate as any[], // lib expects its own type
                timeSlotData,
                constraintRules
            );

            if (violations.length > 0) {
                await this.timetableRepository.update(createdTimetable.id, {
                    fitnessScore: score,
                    constraintViolations: violations
                });

                await createConstraintViolationNotifications({
                    timetableId: createdTimetable.id,
                    batchId: finalBatchId,
                    violations,
                    creatorId: createdBy,
                    departmentId: finalDepartmentId,
                    timetableTitle: title || `Manual Timetable`
                });
            }

            // 10. Workflow
            await (this.supabase.from('workflow_approvals' as any) as any).insert({
                timetable_id: createdTimetable.id,
                workflow_step: 'created',
                performed_by: createdBy,
                comments: 'Manual timetable created',
                approval_level: 'creator'
            });

            return {
                success: true,
                timetable: createdTimetable,
                classes_created: dbClasses.length
            };

        } catch (error) {
            // Rollback
            await this.timetableRepository.delete(createdTimetable.id);
            await this.supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
            throw error;
        }
    }
}
