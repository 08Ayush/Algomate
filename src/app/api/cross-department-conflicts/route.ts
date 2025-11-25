/**
 * Cross-Department Conflicts API
 * Check for resource conflicts and retrieve conflict reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkConflictsBeforePublish, 
  storeConflicts,
  getUnresolvedConflicts,
  resolveConflicts
} from '@/lib/crossDepartmentConflicts';

/**
 * GET /api/cross-department-conflicts
 * Get unresolved conflicts for a timetable
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timetableId = searchParams.get('timetable_id');

    if (!timetableId) {
      return NextResponse.json(
        { success: false, error: 'timetable_id is required' },
        { status: 400 }
      );
    }

    console.log(`📋 Fetching unresolved conflicts for timetable: ${timetableId}`);

    const conflicts = await getUnresolvedConflicts(timetableId);

    return NextResponse.json({
      success: true,
      data: conflicts,
      count: conflicts.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching conflicts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cross-department-conflicts
 * Check for conflicts before publishing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timetable_id, store_conflicts = true } = body;

    if (!timetable_id) {
      return NextResponse.json(
        { success: false, error: 'timetable_id is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking conflicts for timetable: ${timetable_id}`);

    // Check for conflicts
    const result = await checkConflictsBeforePublish(timetable_id);

    // Optionally store conflicts in database
    if (store_conflicts && result.hasConflicts) {
      await storeConflicts(timetable_id, result.conflicts);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: result.hasConflicts
        ? `Found ${result.conflictCount} conflicts (${result.criticalCount} critical)`
        : 'No conflicts detected'
    });

  } catch (error: any) {
    console.error('❌ Error checking conflicts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cross-department-conflicts
 * Resolve conflicts
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conflict_ids } = body;

    if (!conflict_ids || !Array.isArray(conflict_ids)) {
      return NextResponse.json(
        { success: false, error: 'conflict_ids array is required' },
        { status: 400 }
      );
    }

    console.log(`✅ Resolving ${conflict_ids.length} conflicts`);

    await resolveConflicts(conflict_ids);

    return NextResponse.json({
      success: true,
      message: `Resolved ${conflict_ids.length} conflicts`
    });

  } catch (error: any) {
    console.error('❌ Error resolving conflicts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
