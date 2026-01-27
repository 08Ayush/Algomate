import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';
import { IScheduledClassRepository } from '../../domain/repositories/ITimetableRepository';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class GetTimetableUseCase {
    constructor(
        private readonly timetableRepository: ITimetableRepository,
        private readonly scheduledClassRepository: IScheduledClassRepository
    ) { }

    async execute(timetableId: string) {
        // Fetch timetable
        const timetable = await this.timetableRepository.findById(timetableId);
        if (!timetable) {
            throw new Error('Timetable not found');
        }

        // Fetch scheduled classes
        const scheduledClasses = await this.scheduledClassRepository.findByTimetable(timetableId);

        // Enrich timetable with batch and creator info
        const timetableJson: any = timetable.toJSON();

        // Fetch batch name
        if (timetable.batchId) {
            const { data: batch } = await supabase
                .from('batches')
                .select('name')
                .eq('id', timetable.batchId)
                .single();

            timetableJson.batch_name = batch?.name || null;
        }

        // Fetch creator name
        if (timetable.createdBy) {
            const { data: creator } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', timetable.createdBy)
                .single();

            if (creator) {
                timetableJson.creator_name = `${creator.first_name} ${creator.last_name}`;
            }
        }

        // Enrich scheduled classes with subject, faculty, and classroom details
        const enrichedClasses = await Promise.all(
            scheduledClasses.map(async (cls) => {
                const classJson: any = cls.toJSON();

                // Fetch subject details
                const { data: subject } = await supabase
                    .from('subjects')
                    .select('name, code')
                    .eq('id', cls.subjectId)
                    .single();

                if (subject) {
                    classJson.subject_name = subject.name;
                    classJson.subject_code = subject.code;
                }

                // Fetch faculty details
                const { data: faculty } = await supabase
                    .from('users')
                    .select('first_name, last_name')
                    .eq('id', cls.facultyId)
                    .single();

                if (faculty) {
                    classJson.faculty_name = `${faculty.first_name} ${faculty.last_name}`;
                }

                // Fetch classroom details
                const { data: classroom } = await supabase
                    .from('classrooms')
                    .select('name, room_number')
                    .eq('id', cls.classroomId)
                    .single();

                if (classroom) {
                    classJson.classroom_name = classroom.room_number || classroom.name;
                }

                // Fetch time slot details (includes day, start_time, end_time)
                const { data: timeSlot } = await supabase
                    .from('time_slots')
                    .select('day, start_time, end_time')
                    .eq('id', classJson.time_slot_id)
                    .single();

                if (timeSlot) {
                    classJson.day = timeSlot.day;
                    classJson.start_time = timeSlot.start_time;
                    classJson.end_time = timeSlot.end_time;
                } else {
                    // Fallback: use existing start_time/end_time from scheduled_classes
                    classJson.day = 'Unknown';
                }

                return classJson;
            })
        );

        return {
            success: true,
            timetable: timetableJson,
            scheduledClasses: enrichedClasses
        };
    }
}
