import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);

    // Verify user exists and is active - include department_id
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, department_id, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

// GET - Fetch classrooms by department
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department_code');
    const departmentId = searchParams.get('department_id');

    console.log('Fetching classrooms with params:', { departmentCode, departmentId });

    let deptId = departmentId;

    // Get department ID from code if needed
    if (!deptId && departmentCode) {
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id')
        .eq('code', departmentCode)
        .single();

      if (deptError) {
        console.error('Error fetching department:', deptError);
        return NextResponse.json({
          success: false,
          error: 'Department not found',
          data: []
        });
      }

      deptId = deptData?.id;
    }

    // For non-admin users, enforce department filtering
    if (user.role !== 'admin' && !deptId) {
      deptId = user.department_id;
    }

    // Pagination (Dual-Mode)
    const { page, limit, isPaginated } = getPaginationParams(request);

    // Build query to fetch classrooms
    let query = supabase
      .from('classrooms')
      .select(`
        id,
        name,
        building,
        floor_number,
        capacity,
        type,
        has_projector,
        has_ac,
        has_computers,
        has_lab_equipment,
        is_smart_classroom,
        facilities,
        location_notes,
        is_available,
        department:departments!classrooms_department_id_fkey(id, name, code)
      `, { count: 'exact' })
      .eq('is_available', true);

    // Filter by department if provided
    if (deptId) {
      query = query.eq('department_id', deptId);
    }

    // Default sort
    query = query.order('name', { ascending: true });

    // Apply Pagination or Safety Limit
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      query = query.range(from, to);
    } else {
      query = query.limit(500); // Safety cap
    }

    const { data: classroomsData, count, error: classroomsError } = await query;

    if (classroomsError) {
      console.error('Error fetching classrooms:', classroomsError);
      return NextResponse.json({
        success: false,
        error: classroomsError.message,
        data: []
      }, { status: 500 });
    }

    console.log(`Found ${classroomsData?.length || 0} classrooms`);

    // Transform data
    const transformedData = classroomsData?.map((classroom: any) => {
      const department = Array.isArray(classroom.department) ? classroom.department[0] : classroom.department;

      return {
        id: classroom.id,
        name: classroom.name,
        building: classroom.building,
        floor_number: classroom.floor_number,
        capacity: classroom.capacity,
        type: classroom.type,
        has_projector: classroom.has_projector,
        has_ac: classroom.has_ac,
        has_computers: classroom.has_computers,
        has_lab_equipment: classroom.has_lab_equipment,
        is_smart_classroom: classroom.is_smart_classroom,
        facilities: classroom.facilities || [],
        location_notes: classroom.location_notes,
        is_available: classroom.is_available,
        department_name: department?.name || '',
        department_code: department?.code || ''
      };
    }) || [];

    // Calculate statistics (on current slice/total as appropriate)
    const statistics = {
      totalClassrooms: count || 0,
      lectureHalls: transformedData.filter((c: any) => c.type === 'Lecture Hall').length,
      labs: transformedData.filter((c: any) => c.type === 'Lab').length,
      smartClassrooms: transformedData.filter((c: any) => c.is_smart_classroom).length,
    };

    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(transformedData, count || 0, page, limit);
      return NextResponse.json({
        success: true,
        data: paginatedResult.data,
        statistics,
        meta: paginatedResult.meta
      });
    } else {
      return NextResponse.json({
        success: true,
        data: transformedData,
        statistics,
        count: transformedData.length,
        meta: { total: count || 0 }
      });
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      data: []
    }, { status: 500 });
  }
}
