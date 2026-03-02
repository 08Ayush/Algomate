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

  // Setup Realtime subscription
  useEffect(() => {
    // Initial fetch
    fetchSelections();

    // Build filter for Realtime subscription
    let filter = '';
    if (options?.bucketId) {
      filter = `bucket_id=eq.${options.bucketId}`;
    }

    // Setup Realtime channel
    const selectionChannel = supabaseBrowser
      .channel(options?.bucketId ? `student-selections:${options.bucketId}` : 'student-selections')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_subject_choices',
          ...(filter && { filter }),
        },
        async (payload) => {
          console.log('📝 New student selection:', payload.new);

          // Fetch student and subject details
          const selection = payload.new as any;
          
          try {
            const [studentData, subjectData] = await Promise.all([
              supabaseBrowser
                .from('users')
                .select('first_name, last_name')
                .eq('id', selection.student_id)
                .single() as unknown as Promise<{ data: { first_name: string; last_name: string } | null; error: any }>,
              supabaseBrowser
                .from('subjects')
                .select('name, code')
                .eq('id', selection.subject_id)
                .single() as unknown as Promise<{ data: { name: string; code: string } | null; error: any }>,
            ]);

            const enrichedSelection: StudentSelection = {
              id: selection.id,
              student_id: selection.student_id,
              bucket_id: selection.bucket_id,
              subject_id: selection.subject_id,
              priority: selection.priority,
              semester: selection.semester,
              academic_year: selection.academic_year,
              selection_type: selection.selection_type,
              created_at: selection.created_at,
              student_name: studentData.data
                ? `${studentData.data.first_name} ${studentData.data.last_name}` 
                : 'Unknown Student',
              subject_name: subjectData.data?.name || 'Unknown Subject',
            };

            // Add to beginning of list
            setSelections((prev) => [enrichedSelection, ...prev.slice(0, 49)]);
            setTotalCount((prev) => prev + 1);

            // Trigger callback
            if (options?.onNewSelection) {
              options.onNewSelection(enrichedSelection);
            }

            // Optional: Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Student Selection', {
                body: `${enrichedSelection.student_name} selected ${enrichedSelection.subject_name}`,
                icon: '/favicon.ico',
              });
            }
          } catch (err) {
            console.error('Error enriching selection data:', err);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_subject_choices',
          ...(filter && { filter }),
        },
        (payload) => {
          console.log('📝 Student selection updated:', payload.new);
          
          // Update existing selection
          setSelections((prev) =>
            prev.map((s) => (s.id === payload.new.id ? { ...s, ...(payload.new as any) } : s))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'student_subject_choices',
          ...(filter && { filter }),
        },
        (payload) => {
          console.log('🗑️ Student selection deleted:', payload.old);
          
          // Remove deleted selection
          setSelections((prev) => prev.filter((s) => s.id !== payload.old.id));
          setTotalCount((prev) => Math.max(0, prev - 1));
        }
      )
      .subscribe((status) => {
        console.log('🔌 Student selections channel status:', status);
      });

    setChannel(selectionChannel);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribing from student selections channel');
      selectionChannel.unsubscribe();
    };
  }, [fetchSelections, options?.bucketId, options?.onNewSelection]);

  return {
    selections,
    totalCount,
    loading,
    error,
    refetch: fetchSelections,
  };
}

