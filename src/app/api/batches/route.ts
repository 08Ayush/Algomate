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

// GET - Fetch batches by department
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
    let departmentId = searchParams.get('department_id');

    console.log('Fetching batches with params:', { departmentCode, departmentId });

    let deptId = departmentId;

    // For non-admin users, enforce department filtering
    if (user.role !== 'admin' && !deptId) {
      deptId = user.department_id;
    }

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

    // Pagination (Dual-Mode)
    const { page, limit, isPaginated } = getPaginationParams(request);

    // Build query to fetch batches
    let query = supabase
      .from('batches')
      .select(`
        id,
        name,
        semester,
        academic_year,
        section,
        division,
        department_id,
        college_id,
        course_id,
        expected_strength,
        actual_strength,
        max_hours_per_day,
        preferred_start_time,
        preferred_end_time,
        is_active,
        created_at,
        class_coordinator,
        departments:departments(name, code),
        courses:courses(title, code),
        elective_buckets:elective_buckets(
          id, 
          bucket_name,
          subjects:subjects(id, name, code)
        )
      `, { count: 'exact' })
      .eq('is_active', true);

    // Filter by department if provided
    if (deptId) {
      query = query.eq('department_id', deptId);
    }

    // Default sort
    query = query.order('semester', { ascending: true }).order('section', { ascending: true });

    // Apply Pagination or Safety Limit
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      query = query.range(from, to);
    } else {
      query = query.limit(500); // Safety cap
    }

    const { data: batchesData, count, error: batchesError } = await query;

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
      return NextResponse.json({
        success: false,
        error: batchesError.message,
        data: []
      }, { status: 500 });
    }

    console.log(`Found ${batchesData?.length || 0} batches`);

    // Transform data
    const transformedData = batchesData?.map((batch: any) => ({
      id: batch.id,
      name: batch.name,
      semester: batch.semester,
      academic_year: batch.academic_year,
      section: batch.section,
      division: batch.division,
      department_id: batch.department_id,
      college_id: batch.college_id,
      expected_strength: batch.expected_strength,
      actual_strength: batch.actual_strength,
      strength: batch.actual_strength || batch.expected_strength,
      max_hours_per_day: batch.max_hours_per_day,
      preferred_start_time: batch.preferred_start_time,
      preferred_end_time: batch.preferred_end_time,
      is_active: batch.is_active,
      created_at: batch.created_at,
      class_coordinator: batch.class_coordinator,
      departments: batch.departments,
      courses: batch.courses,
      elective_buckets: batch.elective_buckets
    })) || [];

    // Calculate statistics (on current slice)
    const semesterGroups = transformedData.reduce((acc: any, batch: any) => {
      acc[batch.semester] = (acc[batch.semester] || 0) + 1;
      return acc;
    }, {});

    const statistics = {
      totalBatches: count || 0,
      totalStudents: transformedData.reduce((sum: number, b: any) => sum + (b.actual_strength || 0), 0),
      semesterGroups
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

// POST - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      semester,
      academic_year,
      section,
      division,
      expected_strength,
      actual_strength,
      department_code,
      department_id
    } = body;

    console.log('Creating batch:', body);

    // Get department ID if code is provided
    let deptId = department_id;
    if (!deptId && department_code) {
      const { data: deptData } = await supabase
        .from('departments')
        .select('id, college_id')
        .eq('code', department_code)
        .single();

      deptId = deptData?.id;
    }

    if (!deptId) {
      return NextResponse.json({
        success: false,
        error: 'Department not found'
      }, { status: 400 });
    }

    // Get college_id from department
    const { data: deptData } = await supabase
      .from('departments')
      .select('college_id')
      .eq('id', deptId)
      .single();

    const collegeId = deptData?.college_id;

    // Insert new batch
    const { data: batchData, error: batchError } = await supabase
      .from('batches')
      .insert({
        name,
        college_id: collegeId,
        department_id: deptId,
        semester,
        academic_year,
        section: section || 'A',
        division: division || null,
        expected_strength: expected_strength || 60,
        actual_strength: actual_strength || 0,
        is_active: true
      })
      .select()
      .single();

    if (batchError) {
      console.error('Error creating batch:', batchError);
      return NextResponse.json({
        success: false,
        error: batchError.message
      }, { status: 500 });
    }

    console.log('Batch created successfully:', batchData);

    return NextResponse.json({
      success: true,
      data: batchData,
      message: 'Batch created successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// DELETE - Delete a batch
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('id');

    if (!batchId) {
      return NextResponse.json({
        success: false,
        error: 'Batch ID is required'
      }, { status: 400 });
    }

    console.log('Deleting batch:', batchId);

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('batches')
      .update({ is_active: false })
      .eq('id', batchId);

    if (deleteError) {
      console.error('Error deleting batch:', deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 });
    }

    console.log('Batch deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
