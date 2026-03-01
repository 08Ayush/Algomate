/**
 * useRealtimeTaskStatus Hook
 * 
 * Subscribes to real-time timetable generation task updates from Supabase
 * Replaces polling with instant progress notifications
 */

import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TaskStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress_message?: string;
  current_phase?: string;
  progress_percentage?: number;
  result_data?: any;
  error_message?: string;
  fitness_score?: number;
  hard_constraint_violations?: number;
  timetable_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GenerationMetrics {
  strategy: string;
  execution_time: string;
  quality_score: string;
  violations: number;
}

export interface GenerationTask {
  status: 'idle' | 'running' | 'completed' | 'failed';
  phase: string;
  progress: number;
  message: string;
  timetableId?: string;
  metrics?: GenerationMetrics;
}

interface UseRealtimeTaskStatusOptions {
  onComplete?: (timetableId: string, data: TaskStatus) => void;
  onError?: (error: string) => void;
  onUpdate?: (task: GenerationTask) => void;
}

export function useRealtimeTaskStatus(
  taskId: string | null,
  options?: UseRealtimeTaskStatusOptions
) {
  const [task, setTask] = useState<GenerationTask>({
    status: 'idle',
    phase: '',
    progress: 0,
    message: '',
  });
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [startTime] = useState<number>(Date.now());

  // Fetch initial task status
  const fetchTaskStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const { data, error } = await supabaseBrowser
        .from('timetable_generation_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;

      updateTaskFromData(data);
    } catch (err) {
      console.error('Error fetching task status:', err);
    }
  }, [taskId]);

  // Helper to update task state from database data
  const updateTaskFromData = (data: TaskStatus) => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;

    let progress = 0;
    let phase = 'INITIALIZING';

    switch (data.status) {
      case 'pending':
        progress = 5;
        phase = 'PENDING';
        break;
      case 'running':
        progress = data.progress_percentage || Math.min(50 + elapsedSeconds * 0.5, 90);
        phase = data.current_phase || (
          data.progress_message?.includes('CP-SAT') ? 'CP-SAT SOLVER' :
          data.progress_message?.includes('genetic') ? 'GENETIC OPTIMIZATION' : 
          'RUNNING'
        );
        break;
      case 'completed':
        progress = 100;
        phase = 'COMPLETED';
        break;
      case 'failed':
        progress = 0;
        phase = 'FAILED';
        break;
    }

    const updatedTask: GenerationTask = {
      status: data.status === 'pending' || data.status === 'running' ? 'running' 
        : data.status === 'completed' ? 'completed' 
        : data.status === 'failed' ? 'failed' 
        : 'idle',
      phase,
      progress,
      message: data.progress_message || data.error_message || 'Processing...',
      timetableId: data.timetable_id,
    };

    // Add metrics on completion
    if (data.status === 'completed') {
      updatedTask.metrics = {
        strategy: data.result_data?.strategy || 'hybrid',
        execution_time: elapsedSeconds.toFixed(1),
        quality_score: data.fitness_score != null
          ? Math.max(0, Math.min(100, (100 + Number(data.fitness_score)))).toFixed(1)
          : '0',
        violations: data.hard_constraint_violations || 0,
      };
    }

    setTask(updatedTask);

    // Trigger callbacks
    if (options?.onUpdate) {
      options.onUpdate(updatedTask);
    }

    if (data.status === 'completed' && data.timetable_id && options?.onComplete) {
      options.onComplete(data.timetable_id, data);
    }

    if (data.status === 'failed' && options?.onError) {
      options.onError(data.error_message || 'Task failed');
    }
  };

  // Setup Realtime subscription
  useEffect(() => {
    if (!taskId) return;

    // Initial fetch
    fetchTaskStatus();

    // Setup Realtime channel
    const taskChannel = supabaseBrowser
      .channel(`task:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'timetable_generation_tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          console.log('📊 Task status updated:', payload.new);
          updateTaskFromData(payload.new as TaskStatus);
        }
      )
      .subscribe((status) => {
        console.log('🔌 Task channel status:', status);
      });

    setChannel(taskChannel);

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribing from task channel');
      taskChannel.unsubscribe();
    };
  }, [taskId, fetchTaskStatus]);

  return task;
}
