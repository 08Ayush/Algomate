/**
 * Algorithm Execution Metrics Service
 * Tracks performance metrics for CP-SAT and GA algorithm executions
 */

import { supabase } from '@/shared/database/client';

// ============================================================================
// TYPES
// ============================================================================

export type AlgorithmType = 'cp_sat' | 'genetic_algorithm' | 'hybrid';

export interface AlgorithmMetricsInput {
  timetable_id: string;
  algorithm_type: AlgorithmType;
  execution_time_ms: number;
  memory_used_mb?: number;
  iterations_count?: number;
  fitness_score?: number;
  constraint_violations_count?: number;
  success: boolean;
  error_message?: string;
  parameters?: Record<string, any>;
  performance_stats?: Record<string, any>;
}

export interface AlgorithmMetrics extends AlgorithmMetricsInput {
  id: string;
  executed_at: string;
  created_at: string;
}

// ============================================================================
// RECORD METRICS
// ============================================================================

/**
 * Record algorithm execution metrics
 */
export async function recordAlgorithmMetrics(
  data: AlgorithmMetricsInput
): Promise<{ success: boolean; metricId?: string; error?: string }> {
  try {
    const { data: metric, error } = await supabase
      .from('algorithm_execution_metrics')
      .insert({
        timetable_id: data.timetable_id,
        algorithm_type: data.algorithm_type,
        execution_time_ms: data.execution_time_ms,
        memory_used_mb: data.memory_used_mb,
        iterations_count: data.iterations_count,
        fitness_score: data.fitness_score,
        constraint_violations_count: data.constraint_violations_count,
        success: data.success,
        error_message: data.error_message,
        parameters: data.parameters,
        performance_stats: data.performance_stats,
        executed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Failed to record algorithm metrics:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Algorithm metrics recorded: ${metric.id}`);
    return { success: true, metricId: metric.id };
  } catch (error) {
    console.error('❌ Error recording algorithm metrics:', error);
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// QUERY METRICS
// ============================================================================

/**
 * Get metrics for a specific timetable
 */
export async function getTimetableMetrics(
  timetableId: string
): Promise<{ success: boolean; data?: AlgorithmMetrics[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('algorithm_execution_metrics')
      .select('*')
      .eq('timetable_id', timetableId)
      .order('executed_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get performance analytics across multiple executions
 */
export async function getAlgorithmAnalytics(filters?: {
  algorithm_type?: AlgorithmType;
  college_id?: string;
  department_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  data?: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
    avg_execution_time_ms: number;
    avg_memory_used_mb: number;
    avg_fitness_score: number;
    avg_constraint_violations: number;
    by_algorithm_type: Record<AlgorithmType, {
      count: number;
      avg_time: number;
      success_rate: number;
    }>;
  };
  error?: string;
}> {
  try {
    // Build query with filters
    let query = supabase
      .from('algorithm_execution_metrics')
      .select(`
        *,
        generated_timetables!inner(college_id, department_id)
      `);

    if (filters?.algorithm_type) {
      query = query.eq('algorithm_type', filters.algorithm_type);
    }

    if (filters?.college_id) {
      query = query.eq('generated_timetables.college_id', filters.college_id);
    }

    if (filters?.department_id) {
      query = query.eq('generated_timetables.department_id', filters.department_id);
    }

    if (filters?.date_from) {
      query = query.gte('executed_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('executed_at', filters.date_to);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          success_rate: 0,
          avg_execution_time_ms: 0,
          avg_memory_used_mb: 0,
          avg_fitness_score: 0,
          avg_constraint_violations: 0,
          by_algorithm_type: {} as any,
        },
      };
    }

    // Calculate analytics
    const total = data.length;
    const successful = data.filter((m: any) => m.success).length;
    const failed = total - successful;

    const avgTime =
      data.reduce((sum: number, m: any) => sum + (m.execution_time_ms || 0), 0) / total;
    
    const metricsWithMemory = data.filter((m: any) => m.memory_used_mb != null);
    const avgMemory = metricsWithMemory.length > 0
      ? metricsWithMemory.reduce((sum: number, m: any) => sum + m.memory_used_mb!, 0) / metricsWithMemory.length
      : 0;

    const metricsWithFitness = data.filter((m: any) => m.fitness_score != null);
    const avgFitness = metricsWithFitness.length > 0
      ? metricsWithFitness.reduce((sum: number, m: any) => sum + m.fitness_score!, 0) / metricsWithFitness.length
      : 0;

    const metricsWithViolations = data.filter((m: any) => m.constraint_violations_count != null);
    const avgViolations = metricsWithViolations.length > 0
      ? metricsWithViolations.reduce((sum: number, m: any) => sum + m.constraint_violations_count!, 0) / metricsWithViolations.length
      : 0;

    // Group by algorithm type
    const byType: Record<string, any> = {};
    const types = ['cp_sat', 'genetic_algorithm', 'hybrid'];

    types.forEach((type) => {
      const typeMetrics = data.filter((m: any) => m.algorithm_type === type);
      if (typeMetrics.length > 0) {
        const typeSuccessful = typeMetrics.filter((m: any) => m.success).length;
        byType[type] = {
          count: typeMetrics.length,
          avg_time:
            typeMetrics.reduce((sum: number, m: any) => sum + m.execution_time_ms, 0) /
            typeMetrics.length,
          success_rate: (typeSuccessful / typeMetrics.length) * 100,
        };
      }
    });

    return {
      success: true,
      data: {
        total_executions: total,
        successful_executions: successful,
        failed_executions: failed,
        success_rate: (successful / total) * 100,
        avg_execution_time_ms: Math.round(avgTime),
        avg_memory_used_mb: Math.round(avgMemory * 100) / 100,
        avg_fitness_score: Math.round(avgFitness * 100) / 100,
        avg_constraint_violations: Math.round(avgViolations * 100) / 100,
        by_algorithm_type: byType,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get performance comparison between algorithms
 */
export async function compareAlgorithmPerformance(
  timetableId: string
): Promise<{
  success: boolean;
  data?: {
    cp_sat?: AlgorithmMetrics;
    genetic_algorithm?: AlgorithmMetrics;
    hybrid?: AlgorithmMetrics;
    fastest?: AlgorithmType;
    best_fitness?: AlgorithmType;
    most_efficient?: AlgorithmType;
  };
  error?: string;
}> {
  try {
    const result = await getTimetableMetrics(timetableId);

    if (!result.success || !result.data || result.data.length === 0) {
      return { success: false, error: 'No metrics found for timetable' };
    }

    const metrics = result.data;

    // Get latest metric for each algorithm type
    const cpSat = metrics.find((m) => m.algorithm_type === 'cp_sat');
    const ga = metrics.find((m) => m.algorithm_type === 'genetic_algorithm');
    const hybrid = metrics.find((m) => m.algorithm_type === 'hybrid');

    // Determine fastest
    const successfulMetrics = metrics.filter((m) => m.success);
    const fastest = successfulMetrics.length > 0
      ? successfulMetrics.reduce((min, m) =>
          m.execution_time_ms < min.execution_time_ms ? m : min
        ).algorithm_type
      : undefined;

    // Determine best fitness
    const metricsWithFitness = successfulMetrics.filter((m) => m.fitness_score != null);
    const bestFitness = metricsWithFitness.length > 0
      ? metricsWithFitness.reduce((max, m) =>
          m.fitness_score! > max.fitness_score! ? m : max
        ).algorithm_type
      : undefined;

    // Determine most efficient (best fitness / time ratio)
    const mostEfficient = metricsWithFitness.length > 0
      ? metricsWithFitness.reduce((best, m) => {
          const currentRatio = m.fitness_score! / m.execution_time_ms;
          const bestRatio = best.fitness_score! / best.execution_time_ms;
          return currentRatio > bestRatio ? m : best;
        }).algorithm_type
      : undefined;

    return {
      success: true,
      data: {
        cp_sat: cpSat,
        genetic_algorithm: ga,
        hybrid: hybrid,
        fastest,
        best_fitness: bestFitness,
        most_efficient: mostEfficient,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// HELPER: MEASURE EXECUTION
// ============================================================================

/**
 * Wrapper to measure algorithm execution and automatically record metrics
 * 
 * @example
 * const result = await measureAlgorithmExecution(
 *   'timetable-123',
 *   'cp_sat',
 *   async () => {
 *     return await runCPSATAlgorithm(data);
 *   },
 *   { population_size: 100, max_iterations: 1000 }
 * );
 */
export async function measureAlgorithmExecution<T>(
  timetableId: string,
  algorithmType: AlgorithmType,
  algorithmFn: () => Promise<T>,
  parameters?: Record<string, any>
): Promise<{
  result?: T;
  success: boolean;
  metrics: {
    execution_time_ms: number;
    memory_used_mb?: number;
  };
  error?: string;
}> {
  const startTime = performance.now();
  const startMemory = process.memoryUsage ? process.memoryUsage().heapUsed : undefined;

  try {
    const result = await algorithmFn();
    const endTime = performance.now();
    const endMemory = process.memoryUsage ? process.memoryUsage().heapUsed : undefined;

    const executionTime = Math.round(endTime - startTime);
    const memoryUsed = startMemory && endMemory
      ? Math.round(((endMemory - startMemory) / 1024 / 1024) * 100) / 100
      : undefined;

    // Record metrics (non-blocking)
    recordAlgorithmMetrics({
      timetable_id: timetableId,
      algorithm_type: algorithmType,
      execution_time_ms: executionTime,
      memory_used_mb: memoryUsed,
      success: true,
      parameters,
    }).catch((error) => {
      console.error('⚠️ Warning: Failed to record metrics:', error);
    });

    return {
      result,
      success: true,
      metrics: {
        execution_time_ms: executionTime,
        memory_used_mb: memoryUsed,
      },
    };
  } catch (error) {
    const endTime = performance.now();
    const executionTime = Math.round(endTime - startTime);

    // Record failed metrics
    recordAlgorithmMetrics({
      timetable_id: timetableId,
      algorithm_type: algorithmType,
      execution_time_ms: executionTime,
      success: false,
      error_message: String(error),
      parameters,
    }).catch((metricsError) => {
      console.error('⚠️ Warning: Failed to record metrics:', metricsError);
    });

    return {
      success: false,
      error: String(error),
      metrics: {
        execution_time_ms: executionTime,
      },
    };
  }
}
