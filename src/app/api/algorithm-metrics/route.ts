import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  recordAlgorithmMetrics,
  getTimetableMetrics,
  getAlgorithmAnalytics,
  compareAlgorithmPerformance,
  AlgorithmType,
} from '@/lib/algorithmMetrics';

// ============================================================================
// GET - Query algorithm metrics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get metrics for specific timetable
    if (action === 'timetable') {
      const timetableId = searchParams.get('timetable_id');

      if (!timetableId) {
        return NextResponse.json(
          { error: 'timetable_id is required' },
          { status: 400 }
        );
      }

      const result = await getTimetableMetrics(timetableId);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Get performance analytics
    if (action === 'analytics') {
      const algorithmType = searchParams.get('algorithm_type') as AlgorithmType | undefined;
      const collegeId = searchParams.get('college_id') || undefined;
      const departmentId = searchParams.get('department_id') || undefined;
      const dateFrom = searchParams.get('date_from') || undefined;
      const dateTo = searchParams.get('date_to') || undefined;

      const result = await getAlgorithmAnalytics({
        algorithm_type: algorithmType,
        college_id: collegeId,
        department_id: departmentId,
        date_from: dateFrom,
        date_to: dateTo,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Compare algorithm performance for timetable
    if (action === 'compare') {
      const timetableId = searchParams.get('timetable_id');

      if (!timetableId) {
        return NextResponse.json(
          { error: 'timetable_id is required' },
          { status: 400 }
        );
      }

      const result = await compareAlgorithmPerformance(timetableId);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: timetable, analytics, or compare' },
      { status: 400 }
    );
  } catch (error) {
    console.error('❌ Algorithm metrics GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Record algorithm metrics
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    const {
      timetable_id,
      algorithm_type,
      execution_time_ms,
      memory_used_mb,
      iterations_count,
      fitness_score,
      constraint_violations_count,
      success,
      error_message,
      parameters,
      performance_stats,
    } = body;

    // Validation
    if (!timetable_id) {
      return NextResponse.json(
        { error: 'timetable_id is required' },
        { status: 400 }
      );
    }

    if (!algorithm_type || !['cp_sat', 'genetic_algorithm', 'hybrid'].includes(algorithm_type)) {
      return NextResponse.json(
        { error: 'algorithm_type must be cp_sat, genetic_algorithm, or hybrid' },
        { status: 400 }
      );
    }

    if (execution_time_ms == null || typeof execution_time_ms !== 'number') {
      return NextResponse.json(
        { error: 'execution_time_ms must be a number' },
        { status: 400 }
      );
    }

    if (success == null || typeof success !== 'boolean') {
      return NextResponse.json(
        { error: 'success must be a boolean' },
        { status: 400 }
      );
    }

    // Record metrics
    const result = await recordAlgorithmMetrics({
      timetable_id,
      algorithm_type,
      execution_time_ms,
      memory_used_mb,
      iterations_count,
      fitness_score,
      constraint_violations_count,
      success,
      error_message,
      parameters,
      performance_stats,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      metric_id: result.metricId,
      message: 'Algorithm metrics recorded successfully',
    });
  } catch (error) {
    console.error('❌ Algorithm metrics POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
