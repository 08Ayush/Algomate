import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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

    // Verify user exists and is active
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, college_id, role, is_active, department_id')
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

// GET - Fetch subjects by department (with authentication)
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.', data: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const departmentCode = searchParams.get('department_code');
    const departmentId = searchParams.get('department_id');
    const semester = searchParams.get('semester');

    console.log('Fetching subjects with params:', { departmentCode, departmentId, semester });

    // Pagination (Dual-Mode)
    const { page, limit, isPaginated } = getPaginationParams(request);

    // Build query to fetch subjects
    let query = supabase
      .from('subjects')
      .select(`
        id,
        name,
        code,
        college_id,
        department_id,
        semester,
        credits_per_week,
        subject_type,
        preferred_duration,
        max_continuous_hours,
        requires_lab,
        requires_projector,
        is_core_subject,
        nep_category,
        description,
        is_active,
        course_id,
        department:departments!subjects_department_id_fkey(id, name, code)
      `, { count: 'exact' })
      .eq('is_active', true)
      .eq('college_id', user.college_id); // Only show subjects from user's college

    // Apply role-based filtering
    if (user.role === 'student' || user.role === 'faculty') {
      // Students and faculty can only see subjects from their department
      if (user.department_id) {
        query = query.eq('department_id', user.department_id);
      }
    }

    // Filter by department if provided (and user has access)
    if (departmentId) {
      if (user.role === 'admin' || user.role === 'college_admin' || user.department_id === departmentId) {
        query = query.eq('department_id', departmentId);
      }
    } else if (departmentCode) {
      // Get department ID from code
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

    // Default sort
    query = query.order('code', { ascending: true });

    // Apply Pagination or Safety Limit
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      query = query.range(from, to);
    } else {
      query = query.limit(500); // Safety cap
    }

    const { data: subjectsData, count, error: subjectsError } = await query;

    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError);
      return NextResponse.json({
        success: false,
        error: subjectsError.message,
        data: []
      }, { status: 500 });
    }

    console.log(`Found ${subjectsData?.length || 0} subjects`);

    // Transform data - now using semester column directly from subjects table
    const transformedData = subjectsData?.map((subject: any) => {
      const department = Array.isArray(subject.department) ? subject.department[0] : subject.department;

      // Get semester directly from subject (single value, not array)
      const semester = subject.semester;

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        course_id: subject.course_id,
        college_id: subject.college_id,
        department_id: subject.department_id,
        department_name: department?.name || '',
        department_code: department?.code || '',
        semester: semester,
        credits: subject.credits_per_week,
        subject_type: subject.subject_type,
        preferred_duration: subject.preferred_duration,
        max_continuous_hours: subject.max_continuous_hours,
        requires_lab: subject.requires_lab,
        requires_projector: subject.requires_projector,
        is_core_subject: subject.is_core_subject,
        nep_category: subject.nep_category,
        description: subject.description,
        is_active: subject.is_active
      };
    }) || [];

    // Filter by semester if provided (on current slice)
    let filteredData = transformedData;
    if (semester) {
      const semNum = parseInt(semester);
      filteredData = transformedData.filter(s => s.semester === semNum);
    }

    // Group by semester (on returned subjects)
    const groupedBySemester: { [key: number]: any[] } = {};
    for (let sem = 1; sem <= 8; sem++) {
      groupedBySemester[sem] = [];
    }
    filteredData.forEach(subject => {
      const sem = subject.semester;
      if (sem >= 1 && sem <= 8) {
        groupedBySemester[sem].push(subject);
      }
    });

    // Statistics (on returned data/total)
    const statistics = {
      totalSubjects: count || 0,
      totalCredits: filteredData.reduce((sum, s) => sum + (s.credits || 0), 0),
      coreSubjects: filteredData.filter(s => s.is_core_subject).length,
      theorySubjects: filteredData.filter(s => s.subject_type === 'THEORY').length,
      labSubjects: filteredData.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length,
    };

    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(filteredData, count || 0, page, limit);
      return NextResponse.json({
        success: true,
        data: paginatedResult.data,
        groupedBySemester,
        statistics,
        meta: paginatedResult.meta
      });
    } else {
      return NextResponse.json({
        success: true,
        data: filteredData,
        groupedBySemester,
        statistics,
        count: filteredData.length,
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

// POST - Create a new subject (admin only - redirected from /api/admin/subjects)
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user || (user.role !== 'admin' && user.role !== 'college_admin')) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Admin access required.'
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      code,
      college_id,
      department_id,
      semester,
      credits_per_week,
      subject_type,
      preferred_duration,
      max_continuous_hours,
      requires_lab,
      requires_projector,
      is_core_subject,
      description
    } = body;

    console.log('Creating new subject:', { name, code, semester, subject_type });

    // Validate required fields
    if (!name || !code || !department_id || !semester || !credits_per_week || !subject_type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, code, department_id, semester, credits_per_week, subject_type'
      }, { status: 400 });
    }

    // Check if subject code already exists in the department
    const { data: existingSubject } = await supabase
      .from('subjects')
      .select('id, code')
      .eq('code', code)
      .eq('department_id', department_id)
      .single();

    if (existingSubject) {
      return NextResponse.json({
        success: false,
        error: `Subject with code "${code}" already exists in this department`
      }, { status: 409 });
    }

    // Insert new subject
    const { data: newSubject, error: insertError } = await supabase
      .from('subjects')
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        college_id: college_id,
        department_id: department_id,
        semester: parseInt(semester),
        credits_per_week: parseInt(credits_per_week),
        subject_type: subject_type,
        preferred_duration: preferred_duration || 60,
        max_continuous_hours: max_continuous_hours || 1,
        requires_lab: requires_lab || false,
        requires_projector: requires_projector || false,
        is_core_subject: is_core_subject || false,
        description: description || null,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting subject:', insertError);
      return NextResponse.json({
        success: false,
        error: insertError.message
      }, { status: 500 });
    }

    console.log('✅ Subject created successfully:', newSubject.id);

    return NextResponse.json({
      success: true,
      message: 'Subject created successfully',
      data: newSubject
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error creating subject:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
