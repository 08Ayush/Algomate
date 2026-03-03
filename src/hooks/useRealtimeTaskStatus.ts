// Neon does not support Realtime -- type stub for compatibility
type RealtimeChannel = { unsubscribe: () => void };

// Neon does not support Realtime -- type stub for backward compatibility

/**
 * useRealtimeTaskStatus Hook
 *
 * Polls timetable generation task status (Supabase Realtime not available on Neon).
 */

import { useEffect, useState, useCallback, useRef } from 'react';

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
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to update task state from database data
  const updateTaskFromData = useCallback((data: TaskStatus) => {
    const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;

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

    if (options?.onUpdate) options.onUpdate(updatedTask);
    if (data.status === 'completed' && data.timetable_id && options?.onComplete) {
      options.onComplete(data.timetable_id, data);
    }
    if (data.status === 'failed' && options?.onError) {
      options.onError(data.error_message || 'Task failed');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll every 3 seconds while task is active
  const fetchTaskStatus = useCallback(async () => {
    if (!taskId) return;
    try {
      const response = await fetch(`/api/scheduler/status/${taskId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data) updateTaskFromData(data as TaskStatus);
    } catch (err) {
      console.error('Error polling task status:', err);
    }
  }, [taskId, updateTaskFromData]);

  useEffect(() => {
    if (!taskId) return;

    startTimeRef.current = Date.now();
    fetchTaskStatus();

    intervalRef.current = setInterval(() => {
      fetchTaskStatus();
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [taskId, fetchTaskStatus]);

  // Stop polling when task is done
  useEffect(() => {
    if (task.status === 'completed' || task.status === 'failed') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [task.status]);

  return task;
}

