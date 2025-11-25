import { NextRequest, NextResponse } from 'next/server';
import {
  calculateResourceUtilization,
  calculateAllResourceUtilization,
  getResourceUtilizationSummary,
  getUtilizationAnalytics
} from '@/lib/resourceUtilization';

/**
 * GET /api/resource-utilization
 * Query resource utilization data
 * 
 * Query params:
 * - action: 'summary' | 'analytics' | 'calculate' (default: 'summary')
 * - college_id: UUID (required)
 * - academic_year: string (required, e.g., '2024-2025')
 * - semester: string (required, e.g., 'Fall 2024')
 * - department_id: UUID (optional)
 * - resource_type: 'faculty' | 'classroom' | 'time_slot' (optional)
 * - capacity_status: 'underutilized' | 'optimal' | 'near_capacity' | 'overutilized' (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'summary';
    const collegeId = searchParams.get('college_id');
    const academicYear = searchParams.get('academic_year');
    const semester = searchParams.get('semester');
    const departmentId = searchParams.get('department_id') || undefined;
    const resourceType = searchParams.get('resource_type') as any;
    const capacityStatus = searchParams.get('capacity_status') as any;

    if (!collegeId || !academicYear || !semester) {
      return NextResponse.json(
        { success: false, error: 'college_id, academic_year, and semester are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'summary': {
        // Get utilization summary with optional filters
        const result = await getResourceUtilizationSummary({
          collegeId,
          academicYear,
          semester,
          departmentId,
          resourceType,
          capacityStatus
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

      case 'analytics': {
        // Get aggregated analytics
        const result = await getUtilizationAnalytics({
          collegeId,
          academicYear,
          semester,
          departmentId
        });

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          data: result.data
        });
      }

      case 'calculate': {
        // Trigger recalculation of utilization data
        const result = await calculateAllResourceUtilization({
          collegeId,
          academicYear,
          semester,
          departmentId,
          resourceType
        });

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Recalculated utilization for ${result.count} resource(s)`,
          count: result.count
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Must be: summary, analytics, or calculate' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('❌ Error in resource-utilization GET:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resource-utilization
 * Calculate utilization for specific resource or trigger batch calculation
 * 
 * Body (specific resource):
 * {
 *   resource_type: 'faculty' | 'classroom' | 'time_slot',
 *   resource_id: UUID,
 *   college_id: UUID,
 *   academic_year: string,
 *   semester: string,
 *   department_id?: UUID
 * }
 * 
 * Body (batch calculation):
 * {
 *   action: 'calculate_all',
 *   college_id: UUID,
 *   academic_year: string,
 *   semester: string,
 *   department_id?: UUID,
 *   resource_type?: 'faculty' | 'classroom' | 'time_slot'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'calculate_all') {
      // Batch calculation
      const { college_id, academic_year, semester, department_id, resource_type } = body;

      if (!college_id || !academic_year || !semester) {
        return NextResponse.json(
          { success: false, error: 'college_id, academic_year, and semester are required' },
          { status: 400 }
        );
      }

      const result = await calculateAllResourceUtilization({
        collegeId: college_id,
        academicYear: academic_year,
        semester,
        departmentId: department_id,
        resourceType: resource_type
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Calculated utilization for ${result.count} resource(s)`,
        count: result.count
      });
    } else {
      // Single resource calculation
      const { resource_type, resource_id, college_id, academic_year, semester, department_id } = body;

      if (!resource_type || !resource_id || !college_id || !academic_year || !semester) {
        return NextResponse.json(
          { success: false, error: 'resource_type, resource_id, college_id, academic_year, and semester are required' },
          { status: 400 }
        );
      }

      const result = await calculateResourceUtilization({
        resourceType: resource_type,
        resourceId: resource_id,
        collegeId: college_id,
        academicYear: academic_year,
        semester,
        departmentId: department_id
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Resource utilization calculated successfully',
        data: result.data
      });
    }
  } catch (error: any) {
    console.error('❌ Error in resource-utilization POST:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
