// Neon does not support Realtime -- type stub for compatibility
type RealtimeChannel = { unsubscribe: () => void };

// Neon does not support Realtime -- type stub for backward compatibility

/**
 * useRealtimeConflictDetection Hook
 * 
 * Subscribes to real-time conflict detection for timetable scheduling
 * Monitors master_scheduled_classes table for potential conflicts
 */

import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
export interface ResourceConflict {
  resource_type: 'FACULTY' | 'CLASSROOM';
  resource_id: string;
  resource_name: string;
  time_slot_id: string;
  day?: string;
  start_time?: string;
  end_time?: string;
  conflicting_timetables: ConflictingTimetable[];
  severity: 'CRITICAL' | 'WARNING';
  conflict_description: string;
}

export interface ConflictingTimetable {
  timetable_id: string;
  timetable_title: string;
  department_id: string;
  department_name: string;
  batch_id: string;
  batch_name: string;
  subject_id: string;
  subject_name: string;
  class_id: string;
}

interface UseRealtimeConflictDetectionOptions {
  collegeId: string;
  departmentId?: string;
  onConflictDetected?: (conflict: ResourceConflict) => void;
  autoCheck?: boolean;
}

export function useRealtimeConflictDetection(options: UseRealtimeConflictDetectionOptions) {
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Check for conflicts when new class is added
  const checkForConflicts = useCallback(async (newClass: any) => {
    try {
      // Check faculty conflicts
      const { data: facultyConflicts } = await supabaseBrowser
        .from('master_scheduled_classes')
        .select(`
          *,
          master_accepted_timetables!inner(
            id,
            title,
            department_id,
            departments(name)
          ),
          subjects(name, code),
          batches(name),
          time_slots(day, start_time, end_time)
        `)
        .eq('faculty_id', newClass.faculty_id)
        .eq('time_slot_id', newClass.time_slot_id)
        .neq('id', newClass.id);

      if (facultyConflicts && facultyConflicts.length > 0) {
        // Fetch faculty details
        const { data: facultyData } = (await supabaseBrowser
          .from('users')
          .select('first_name, last_name')
          .eq('id', newClass.faculty_id)
          .single()) as { data: { first_name: string; last_name: string } | null; error: any };

        const conflictData: ResourceConflict = {
          resource_type: 'FACULTY',
          resource_id: newClass.faculty_id,
          resource_name: facultyData
            ? `${facultyData.first_name} ${facultyData.last_name}`
            : 'Unknown Faculty',
          time_slot_id: newClass.time_slot_id,
          day: (facultyConflicts[0] as any)?.time_slots?.day,
          start_time: (facultyConflicts[0] as any)?.time_slots?.start_time,
          end_time: (facultyConflicts[0] as any)?.time_slots?.end_time,
          conflicting_timetables: facultyConflicts.map((item: any) => ({
            timetable_id: item.master_timetable_id,
            timetable_title: item.master_accepted_timetables?.title || 'Unknown',
            department_id: item.master_accepted_timetables?.department_id || '',
            department_name: item.master_accepted_timetables?.departments?.name || 'Unknown',
            batch_id: item.batch_id,
            batch_name: item.batches?.name || 'Unknown',
            subject_id: item.subject_id,
            subject_name: item.subjects?.name || 'Unknown',
            class_id: item.id,
          })),
          severity: 'CRITICAL',
          conflict_description: `Faculty double-booked at ${(facultyConflicts[0] as any).time_slots?.day} ${(facultyConflicts[0] as any).time_slots?.start_time}`,
        };

        setConflicts((prev) => [conflictData, ...prev]);
        
        if (options.onConflictDetected) {
          options.onConflictDetected(conflictData);
        }
      }

      // Check classroom conflicts
      if (newClass.classroom_id) {
        const { data: classroomConflicts } = await supabaseBrowser
          .from('master_scheduled_classes')
          .select(`
            *,
            master_accepted_timetables!inner(
              id,
              title,
              department_id,
              departments(name)
            ),
            subjects(name, code),
            batches(name),
            time_slots(day, start_time, end_time)
          `)
          .eq('classroom_id', newClass.classroom_id)
          .eq('time_slot_id', newClass.time_slot_id)
          .neq('id', newClass.id);

        if (classroomConflicts && classroomConflicts.length > 0) {
          // Fetch classroom details
          const { data: classroomData } = (await supabaseBrowser
            .from('classrooms')
            .select('building, room_number, room_type')
            .eq('id', newClass.classroom_id)
            .single()) as { data: { building: string; room_number: string; room_type: string } | null; error: any };

          const conflictData: ResourceConflict = {
            resource_type: 'CLASSROOM',
            resource_id: newClass.classroom_id,
            resource_name: classroomData
              ? `${classroomData.building}-${classroomData.room_number} (${classroomData.room_type})`
              : 'Unknown Classroom',
            time_slot_id: newClass.time_slot_id,
            day: (classroomConflicts[0] as any)?.time_slots?.day,
            start_time: (classroomConflicts[0] as any)?.time_slots?.start_time,
            end_time: (classroomConflicts[0] as any)?.time_slots?.end_time,
            conflicting_timetables: classroomConflicts.map((item: any) => ({
              timetable_id: item.master_timetable_id,
              timetable_title: item.master_accepted_timetables?.title || 'Unknown',
              department_id: item.master_accepted_timetables?.department_id || '',
              department_name: item.master_accepted_timetables?.departments?.name || 'Unknown',
              batch_id: item.batch_id,
              batch_name: item.batches?.name || 'Unknown',
              subject_id: item.subject_id,
              subject_name: item.subjects?.name || 'Unknown',
              class_id: item.id,
            })),
            severity: 'CRITICAL',
            conflict_description: `Classroom double-booked at ${(classroomConflicts[0] as any).time_slots?.day} ${(classroomConflicts[0] as any).time_slots?.start_time}`,
          };

          setConflicts((prev) => [conflictData, ...prev]);
          
          if (options.onConflictDetected) {
            options.onConflictDetected(conflictData);
          }
        }
      }
    } catch (err) {
      console.error('Error checking conflicts:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [options]);

  // Setup Realtime subscription
  useEffect(() => {
    if (!options.autoCheck) return;

    // Subscribe to master_scheduled_classes changes
    const conflictChannel = supabaseBrowser
      .channel(`conflicts:${options.collegeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'master_scheduled_classes',
        },
        (payload) => {
          console.log('⚠️ New class added to master registry:', payload.new);
          checkForConflicts(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'master_scheduled_classes',
        },
        (payload) => {
          console.log('⚠️ Class updated in master registry:', payload.new);
          checkForConflicts(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('🔌 Conflict detection channel status:', status);
      });

    setChannel(conflictChannel);

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribing from conflict detection channel');
      conflictChannel.unsubscribe();
    };
  }, [options.collegeId, options.autoCheck, checkForConflicts]);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  return {
    conflicts,
    loading,
    error,
    clearConflicts,
  };
}

