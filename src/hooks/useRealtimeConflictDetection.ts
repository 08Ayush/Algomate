// Neon does not support Realtime -- type stub for compatibility
type RealtimeChannel = { unsubscribe: () => void };

/**
 * useRealtimeConflictDetection Hook
 * 
 * ⚠️ IMPORTANT: Uses POLLING instead of Realtime (Neon PostgreSQL limitation)
 * 
 * This hook provides conflict detection for timetable scheduling using
 * a polling mechanism instead of realtime subscriptions.
 * 
 * HOW IT WORKS:
 * 1. Checks for conflicts every 30 seconds
 * 2. Fetches classes added/updated in the last 2 minutes
 * 3. Automatically detects faculty and classroom double-bookings
 * 4. Triggers onConflictDetected callback when conflicts are found
 * 
 * PERFORMANCE:
 * - Polling interval: 30 seconds
 * - Detection window: Last 2 minutes
 * - Max classes checked per poll: 50
 * 
 * USAGE:
 * ```typescript
 * const { conflicts, loading, clearConflicts } = useRealtimeConflictDetection({
 *   collegeId: 'college-123',
 *   autoCheck: true,
 *   onConflictDetected: (conflict) => {
 *     toast.error(`Conflict detected: ${conflict.conflict_description}`);
 *   }
 * });
 * ```
 * 
 * Currently monitors master_scheduled_classes table for potential conflicts.
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

  // Setup polling-based conflict detection (Neon doesn't support Realtime)
  useEffect(() => {
    if (!options.autoCheck) return;

    console.log('🔄 Starting polling-based conflict detection (checking every 30 seconds)');
    setLoading(true);

    // Check for recent conflicts immediately on mount
    const checkRecentConflicts = async () => {
      try {
        // Fetch classes added/updated in the last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        
        const { data: recentClasses, error } = await supabaseBrowser
          .from('master_scheduled_classes')
          .select('*')
          .eq('college_id', options.collegeId)
          .gte('created_at', twoMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('❌ Error fetching recent classes:', error);
          setError(new Error(error.message || 'Failed to fetch recent classes'));
          return;
        }

        if (recentClasses && recentClasses.length > 0) {
          console.log(`🔍 Checking ${recentClasses.length} recent classes for conflicts`);
          
          // Check each recent class for conflicts
          for (const cls of recentClasses) {
            await checkForConflicts(cls);
          }
        }
      } catch (err) {
        console.error('❌ Error in conflict polling:', err);
        setError(err instanceof Error ? err : new Error('Unknown polling error'));
      } finally {
        setLoading(false);
      }
    };

    // Run immediately
    checkRecentConflicts();

    // Set up polling interval (every 30 seconds)
    const pollInterval = setInterval(() => {
      checkRecentConflicts();
    }, 30000); // 30 seconds

    // Create a cleanup object
    const cleanupChannel: RealtimeChannel = {
      unsubscribe: () => {
        console.log('🔌 Stopping conflict detection polling');
        clearInterval(pollInterval);
      }
    };

    setChannel(cleanupChannel);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up conflict detection hook');
      clearInterval(pollInterval);
    };
  }, [options.collegeId, options.autoCheck, checkForConflicts]);

  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  // Manual check function that components can call on-demand
  const manualCheck = useCallback(async () => {
    setLoading(true);
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      
      const { data: recentClasses, error } = await supabaseBrowser
        .from('master_scheduled_classes')
        .select('*')
        .eq('college_id', options.collegeId)
        .gte('created_at', oneMinuteAgo)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Manual check error:', error);
        setError(new Error(error.message || 'Manual check failed'));
        return;
      }

      if (recentClasses && recentClasses.length > 0) {
        console.log(`🔍 Manual check: ${recentClasses.length} classes`);
        for (const cls of recentClasses) {
          await checkForConflicts(cls);
        }
      } else {
        console.log('✅ Manual check: No recent classes to check');
      }
    } catch (err) {
      console.error('❌ Manual check error:', err);
      setError(err instanceof Error ? err : new Error('Manual check failed'));
    } finally {
      setLoading(false);
    }
  }, [options.collegeId, checkForConflicts]);

  return {
    conflicts,
    loading,
    error,
    clearConflicts,
    manualCheck, // New: allow manual conflict checking
    checkForConflicts, // Expose for checking specific classes
  };
}

