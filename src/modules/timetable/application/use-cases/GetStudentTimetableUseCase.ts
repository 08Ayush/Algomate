import type { NeonClient as SupabaseClient } from '@/lib/neon-supabase-compat';
import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';
// We might need IScheduledClassRepository to fetch classes
import { Database } from '@/shared/database';

export class GetStudentTimetableUseCase {
    constructor(
        private readonly db: SupabaseClient // Direct DB access for complex join similar to legacy route?
        // Or inject repositories? 
        // The legacy route does a massive join on 'scheduled_classes'.
        // Let's wrap this query in a tailored method in ScheduledClassRepository or here if it's unique.
        // Ideally, ScheduledClassRepository should handle it.
    ) { }

    async execute(timetableId: string) {
        // Reuse the logic from legacy route but via a repository or clean query here.
        // For speed, let's keep the query here or move to repo. 
        // Let's better move it to a Repository method `findByTimetableIdWithDetails`.

        // However, I don't have IScheduledClassRepository defined in my context list completely yet (I think I created it earlier?).
        // Let's check or just write the query here if allowed to access Supabase directly in Use Case (not ideal but pragmatic for complex reads).
        // A better approach is `IScheduledClassRepository.findByTimetableWithDetails(id)`.

        const { data: classes, error } = await this.db
            .from('scheduled_classes')
            .select(`
                id,
                subject_id,
                faculty_id,
                classroom_id,
                time_slot_id,
                class_type,
                credit_hour_number,
                session_duration,
                subjects (
                  id,
                  name,
                  code,
                  subject_type,
                  credits_per_week
                ),
                faculty:users!faculty_id (
                  id,
                  first_name,
                  last_name
                ),
                classrooms (
                  id,
                  name,
                  building,
                  floor_number,
                  capacity
                ),
                time_slots (
                  id,
                  day,
                  start_time,
                  end_time,
                  is_break_time,
                  is_lunch_time
                )
            `)
            .eq('timetable_id', timetableId);

        if (error) throw error;

        return classes || [];
    }
}
