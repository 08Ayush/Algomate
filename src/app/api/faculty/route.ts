import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

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

import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

// ... (existing imports)

// GET - Fetch faculty members
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department_code');
    let departmentId = searchParams.get('department_id');

    // Pagination
    const { page, limit, isPaginated } = getPaginationParams(request);

    console.log('Fetching faculty with params:', { departmentCode, departmentId });

    // For non-admin users, enforce department filtering
    if (user.role !== 'admin' && !departmentId) {
      departmentId = user.department_id;
    }

    // Build query to fetch faculty with department info
    let query = supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        college_uid,
        faculty_type,
        department_id,
        max_hours_per_day,
        max_hours_per_week,
        is_active,
        created_at,
        department:departments!users_department_id_fkey(id, name, code),
        qualified_subjects:faculty_qualified_subjects(
          subject:subjects(name, code)
        )
      `, { count: 'exact' })
      .eq('role', 'faculty')
      .eq('is_active', true);

    // Filter by department if provided
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else if (departmentCode) {
      // First get the department ID from code
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

      if (deptData) {
        query = query.eq('department_id', deptData.id);
      }
    }

    // Apply Pagination or Safety Limit
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      query = query
        .order('first_name', { ascending: true })
        .range(from, to);
    } else {
      query = query
        .order('first_name', { ascending: true })
        .limit(500); // Safety cap
    }

    const { data: facultyData, count, error: facultyError } = await query;

    if (facultyError) {
      console.error('Error fetching faculty:', facultyError);
      return NextResponse.json({
        success: false,
        error: facultyError.message,
        data: []
      }, { status: 500 });
    }

    console.log(`Found ${facultyData?.length || 0} faculty members`);

    // Fetched data already includes subjects due to join
    const facultyWithSubjects = (facultyData || []).map((faculty: any) => {
      const subjects = faculty.qualified_subjects?.map((qs: any) => qs.subject?.name || qs.subject?.code).filter(Boolean) || [];

      // Handle department array or object depending on return shape (single vs array relation)
      const department = Array.isArray(faculty.department) ? faculty.department[0] : faculty.department;

      return {
        id: faculty.id,
        first_name: faculty.first_name,
        last_name: faculty.last_name,
        email: faculty.email,
        phone: faculty.phone,
        college_uid: faculty.college_uid,
        faculty_type: faculty.faculty_type,
        department_id: faculty.department_id,
        department_name: department?.name || '',
        department_code: department?.code || '',
        max_hours_per_day: faculty.max_hours_per_day,
        max_hours_per_week: faculty.max_hours_per_week,
        is_active: faculty.is_active,
        subjects: subjects,
        created_at: faculty.created_at
      };
    });

    let meta;
    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(facultyWithSubjects, count || 0, page, limit);
      meta = paginatedResult.meta;
    } else {
      meta = {
        total: facultyWithSubjects.length,
        page: 1,
        limit: 500
      };
    }

    return NextResponse.json({
      success: true,
      data: facultyWithSubjects,
      count: facultyWithSubjects.length,
      meta
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      data: []
    }, { status: 500 });
  }
}
