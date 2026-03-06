// Neon does not support Realtime -- type stub for compatibility
type RealtimeChannel = { unsubscribe: () => void };

// Neon does not support Realtime -- type stub for backward compatibility

/**
 * useRealtimeStudentSelections Hook
 * 
 * Subscribes to real-time student course selection submissions from Supabase
 * Use this in admin dashboards to track student submissions as they happen
 */

import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
export interface StudentSelection {
  id: string;
  student_id: string;
  bucket_id?: string;
  subject_id: string;
  priority?: number;
  semester: number;
  academic_year: string;
  selection_type?: string;
  created_at: string;
  student_name?: string;
  subject_name?: string;
}

interface UseRealtimeStudentSelectionsOptions {
  bucketId?: string;
  semester?: number;
  departmentId?: string;
  collegeId?: string;
  onNewSelection?: (selection: StudentSelection) => void;
}

export function useRealtimeStudentSelections(options?: UseRealtimeStudentSelectionsOptions) {
  const [selections, setSelections] = useState<StudentSelection[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Fetch initial selections
  const fetchSelections = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabaseBrowser
        .from('student_subject_choices')
        .select('*, users!inner(first_name, last_name), subjects(name, code)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (options?.bucketId) {
        query = query.eq('bucket_id', options.bucketId);
      }
      if (options?.semester) {
        query = query.eq('semester', options.semester);
      }
      if (options?.collegeId) {
        query = query.eq('users.college_id', options.collegeId);
      }
      if (options?.departmentId) {
        query = query.eq('users.department_id', options.departmentId);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Map data to our interface
      const mappedData: StudentSelection[] = (data || []).map((item: any) => ({
        id: item.id,
        student_id: item.student_id,
        bucket_id: item.bucket_id,
        subject_id: item.subject_id,
        priority: item.priority,
        semester: item.semester,
        academic_year: item.academic_year,
        selection_type: item.selection_type,
        created_at: item.created_at,
        student_name: item.users 
          ? `${item.users.first_name} ${item.users.last_name}` 
          : 'Unknown Student',
        subject_name: item.subjects?.name || 'Unknown Subject',
      }));

      setSelections(mappedData);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Error fetching student selections:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [options?.bucketId, options?.semester, options?.collegeId, options?.departmentId]);

  // Polling-based subscription (Neon does not support Supabase Realtime)
  useEffect(() => {
    // Initial fetch
    fetchSelections();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Track known selections for change detection
    const knownIds = new Set<string>();
    const knownTimestamps = new Map<string, string>();

    const poll = async () => {
      try {
        let query = supabaseBrowser
          .from('student_subject_choices')
          .select('*, users!inner(first_name, last_name), subjects(name, code)', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(50);

        if (options?.bucketId) query = query.eq('bucket_id', options.bucketId);
        if (options?.semester) query = query.eq('semester', options.semester);
        if (options?.collegeId) query = query.eq('users.college_id', options.collegeId);
        if (options?.departmentId) query = query.eq('users.department_id', options.departmentId);

        const { data, error: fetchError, count } = await query;
        if (fetchError) throw fetchError;

        const mapped: StudentSelection[] = (data || []).map((item: any) => ({
          id: item.id,
          student_id: item.student_id,
          bucket_id: item.bucket_id,
          subject_id: item.subject_id,
          priority: item.priority,
          semester: item.semester,
          academic_year: item.academic_year,
          selection_type: item.selection_type,
          created_at: item.created_at,
          student_name: item.users
            ? `${item.users.first_name} ${item.users.last_name}`
            : 'Unknown Student',
          subject_name: item.subjects?.name || 'Unknown Subject',
        }));

        const currentIds = new Set(mapped.map((s) => s.id));

        // Detect NEW selections
        for (const sel of mapped) {
          if (!knownIds.has(sel.id)) {
            if (knownIds.size > 0) {
              // Not the first poll — this is a genuinely new selection
              console.log('📝 New student selection detected:', sel.id);
              if (options?.onNewSelection) options.onNewSelection(sel);

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('New Student Selection', {
                  body: `${sel.student_name} selected ${sel.subject_name}`,
                  icon: '/favicon.ico',
                });
              }
            }
            knownIds.add(sel.id);
            knownTimestamps.set(sel.id, sel.created_at);
          }
        }

        // Detect DELETED selections
        for (const id of knownIds) {
          if (!currentIds.has(id)) {
            console.log('🗑️ Student selection deleted:', id);
            knownIds.delete(id);
            knownTimestamps.delete(id);
          }
        }

        setSelections(mapped);
        setTotalCount(count || 0);
      } catch (err) {
        console.error('Error polling student selections:', err);
      }
    };

    const intervalId = setInterval(poll, 30000); // poll every 30 seconds

    const mockChannel: RealtimeChannel = { unsubscribe: () => clearInterval(intervalId) };
    setChannel(mockChannel);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchSelections, options?.bucketId, options?.semester, options?.collegeId, options?.departmentId, options?.onNewSelection]);

  return {
    selections,
    totalCount,
    loading,
    error,
    refetch: fetchSelections,
  };
}

