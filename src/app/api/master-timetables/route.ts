/**
 * Master Timetable Registry API
 * Manage college-wide published timetables
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveMasterTimetables,
  getResourceOccupation,
  getMasterRegistryStats,
  isResourceAvailable
} from '@/lib/masterTimetableRegistry';

/**
 * GET /api/master-timetables
 * Get all active published timetables in master registry
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const collegeId = searchParams.get('college_id');
    const departmentId = searchParams.get('department_id');
    const academicYear = searchParams.get('academic_year');
    const semester = searchParams.get('semester');
    const action = searchParams.get('action'); // 'list' | 'stats' | 'occupation' | 'check_availability'

    if (action === 'stats') {
      if (!collegeId || !academicYear) {
        return NextResponse.json(
          { success: false, error: 'college_id and academic_year are required for stats' },
          { status: 400 }
        );
      }

      const stats = await getMasterRegistryStats(collegeId, academicYear);
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === 'occupation') {
      if (!collegeId || !academicYear) {
        return NextResponse.json(
          { success: false, error: 'college_id and academic_year are required for occupation' },
          { status: 400 }
        );
      }

      const occupation = await getResourceOccupation(collegeId, academicYear);
      return NextResponse.json({
        success: true,
        data: {
          faculty: Object.fromEntries(occupation.faculty),
          classrooms: Object.fromEntries(occupation.classrooms),
          timeSlots: Object.fromEntries(occupation.timeSlots)
        }
      });
    }

    if (action === 'check_availability') {
      const resourceType = searchParams.get('resource_type') as 'faculty' | 'classroom';
      const resourceId = searchParams.get('resource_id');
      const timeSlotId = searchParams.get('time_slot_id');
      const excludeTimetableId = searchParams.get('exclude_timetable_id') || undefined;

      if (!resourceType || !resourceId || !timeSlotId) {
        return NextResponse.json(
          { success: false, error: 'resource_type, resource_id, and time_slot_id are required' },
          { status: 400 }
        );
      }

      const isAvailable = await isResourceAvailable(
        resourceType,
        resourceId,
        timeSlotId,
        excludeTimetableId
      );

      return NextResponse.json({
        success: true,
        data: { available: isAvailable }
      });
    }

    // Default: List master timetables
    const filters: any = {};
    if (collegeId) filters.college_id = collegeId;
    if (departmentId) filters.department_id = departmentId;
    if (academicYear) filters.academic_year = academicYear;
    if (semester) filters.semester = parseInt(semester);

    const timetables = await getActiveMasterTimetables(filters);

    return NextResponse.json({
      success: true,
      data: timetables,
      count: timetables.length
    });

  } catch (error: any) {
    console.error('❌ Error in master-timetables API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
