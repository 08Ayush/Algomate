import { NextRequest, NextResponse } from 'next/server';
import {
  setFacultyAvailability,
  setBulkFacultyAvailability,
  getFacultyAvailability,
  isFacultyAvailable,
  deleteFacultyAvailability,
  clearFacultyAvailability,
  getAllFacultyAvailabilitySummary,
  getFacultyUnavailableSlots,
  getFacultyPreferences,
  type FacultyAvailabilityInput
} from '@/lib/facultyAvailability';

/**
 * GET /api/faculty-availability
 * Query faculty availability
 * 
 * Query params:
 * - action: 'get' | 'check' | 'summary' | 'unavailable' | 'preferences'
 * - faculty_id: UUID (required for get, check, unavailable, preferences)
 * - time_slot_id: UUID (required for check)
 * - department_id: UUID (optional for summary)
 * - include_expired: boolean (optional for get)
 * - day_of_week: string (optional for get)
 * - availability_type: string (optional for get)
 * - check_date: YYYY-MM-DD (optional for check, unavailable, preferences)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'get';
    const facultyId = searchParams.get('faculty_id');
    const timeSlotId = searchParams.get('time_slot_id');
    const departmentId = searchParams.get('department_id');
    const includeExpired = searchParams.get('include_expired') === 'true';
    const dayOfWeek = searchParams.get('day_of_week');
    const availabilityType = searchParams.get('availability_type');
    const checkDate = searchParams.get('check_date') || undefined;

    switch (action) {
      case 'get': {
        // Get faculty availability with details
        if (!facultyId) {
          return NextResponse.json(
            { success: false, error: 'faculty_id is required' },
            { status: 400 }
          );
        }

        const result = await getFacultyAvailability(facultyId, {
          includeExpired,
          dayOfWeek: dayOfWeek || undefined,
          availabilityType: availabilityType as any
        });

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: result.data,
          count: result.data?.length || 0
        });
      }

      case 'check': {
        // Check if faculty is available at specific time slot
        if (!facultyId || !timeSlotId) {
          return NextResponse.json(
            { success: false, error: 'faculty_id and time_slot_id are required' },
            { status: 400 }
          );
        }

        const result = await isFacultyAvailable(facultyId, timeSlotId, checkDate);
        return NextResponse.json({ success: true, data: result });
      }

      case 'summary': {
        // Get summary of all faculty availability
        const result = await getAllFacultyAvailabilitySummary(
          departmentId || undefined
        );

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: result.data,
          count: result.data?.length || 0
        });
      }

      case 'unavailable': {
        // Get list of unavailable time slot IDs for faculty
        if (!facultyId) {
          return NextResponse.json(
            { success: false, error: 'faculty_id is required' },
            { status: 400 }
          );
        }

        const timeSlotIds = await getFacultyUnavailableSlots(facultyId, checkDate);
        return NextResponse.json({
          success: true,
          data: timeSlotIds,
          count: timeSlotIds.length
        });
      }

      case 'preferences': {
        // Get faculty preferences (preferred/avoid slots)
        if (!facultyId) {
          return NextResponse.json(
            { success: false, error: 'faculty_id is required' },
            { status: 400 }
          );
        }

        const preferences = await getFacultyPreferences(facultyId, checkDate);
        return NextResponse.json({
          success: true,
          data: preferences,
          preferred_count: preferences.preferred.length,
          avoid_count: preferences.avoid.length
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be: get, check, summary, unavailable, or preferences' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ Error in faculty-availability GET:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/faculty-availability
 * Create or update faculty availability
 * 
 * Body (single):
 * {
 *   faculty_id: UUID,
 *   time_slot_id: UUID,
 *   availability_type: 'available' | 'unavailable' | 'preferred' | 'avoid',
 *   preference_weight?: number,
 *   effective_from?: string,
 *   effective_until?: string,
 *   notes?: string
 * }
 * 
 * Body (bulk):
 * {
 *   faculty_id: UUID,
 *   time_slot_ids: UUID[],
 *   availability_type: 'available' | 'unavailable' | 'preferred' | 'avoid',
 *   notes?: string,
 *   effective_from?: string,
 *   effective_until?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if bulk operation
    if (body.time_slot_ids && Array.isArray(body.time_slot_ids)) {
      // Bulk operation
      const { faculty_id, time_slot_ids, availability_type, notes, effective_from, effective_until } = body;

      if (!faculty_id || !time_slot_ids || time_slot_ids.length === 0 || !availability_type) {
        return NextResponse.json(
          { success: false, error: 'faculty_id, time_slot_ids, and availability_type are required' },
          { status: 400 }
        );
      }

      const result = await setBulkFacultyAvailability(
        faculty_id,
        time_slot_ids,
        availability_type,
        { notes, effectiveFrom: effective_from, effectiveUntil: effective_until }
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Set availability for ${result.count} time slot(s)`,
        count: result.count
      });
    } else {
      // Single operation
      const { faculty_id, time_slot_id, availability_type } = body;

      if (!faculty_id || !time_slot_id || !availability_type) {
        return NextResponse.json(
          { success: false, error: 'faculty_id, time_slot_id, and availability_type are required' },
          { status: 400 }
        );
      }

      const result = await setFacultyAvailability(body as FacultyAvailabilityInput);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Faculty availability set successfully',
        data: result.availability
      });
    }
  } catch (error: any) {
    console.error('❌ Error in faculty-availability POST:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/faculty-availability
 * Delete faculty availability record(s)
 * 
 * Query params:
 * - faculty_id: UUID (required)
 * - time_slot_id: UUID (optional, if not provided clears all)
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const facultyId = searchParams.get('faculty_id');
    const timeSlotId = searchParams.get('time_slot_id');

    if (!facultyId) {
      return NextResponse.json(
        { success: false, error: 'faculty_id is required' },
        { status: 400 }
      );
    }

    if (timeSlotId) {
      // Delete specific availability record
      const result = await deleteFacultyAvailability(facultyId, timeSlotId);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Faculty availability deleted successfully'
      });
    } else {
      // Clear all availability for faculty
      const result = await clearFacultyAvailability(facultyId);

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Cleared ${result.count} availability record(s)`
      });
    }
  } catch (error: any) {
    console.error('❌ Error in faculty-availability DELETE:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
