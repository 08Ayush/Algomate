import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Create server-side supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get user from Authorization header
async function getAuthenticatedUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Decode and verify the user token
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);

    // Verify user exists and is active - include department_id
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, college_id, department_id, role, faculty_type, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    // For write operations, only allow admin/college_admin
    if (requireAdmin && !['admin', 'college_admin'].includes(dbUser.role)) {
      return null;
    }

    // For read operations, allow admin, college_admin, and faculty with creator/publisher types
    if (!requireAdmin) {
      const allowedRoles = ['admin', 'college_admin'];
      const allowedFacultyTypes = ['creator', 'publisher'];

      if (!allowedRoles.includes(dbUser.role) &&
        !(dbUser.role === 'faculty' && allowedFacultyTypes.includes(dbUser.faculty_type))) {
        return null;
      }
    }

    return dbUser;
  } catch {
    return null;
  }
}

// GET: Fetch all faculty qualifications (filtered by department for creator users)
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user - allow read access for creator/publisher
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('faculty_id');

    console.log('📥 Fetching faculty qualifications for user:', {
      role: user.role,
      faculty_type: user.faculty_type,
      department_id: user.department_id,
      facultyId
    });

    // Use !inner joins to filter at DB level by college_id (avoids full table scan)
    let query = supabaseAdmin
      .from('faculty_qualified_subjects')
      .select(`
        id,
        faculty_id,
        subject_id,
        proficiency_level,
        preference_score,
        teaching_load_weight,
        is_primary_teacher,
        can_handle_lab,
        can_handle_tutorial,
        created_at,
        faculty:users!faculty_qualified_subjects_faculty_id_fkey!inner(
          id,
          first_name,
          last_name,
          email,
          course_id,
          college_id,
          department_id
        ),
        subject:subjects!inner(
          id,
          name,
          code,
          subject_type,
          semester,
          credits_per_week,
          requires_lab,
          course_id,
          college_id,
          department_id
        )
      `)
      .eq('faculty.college_id', user.college_id)
      .eq('subject.college_id', user.college_id)
      .order('created_at', { ascending: false });

    if (facultyId) {
      query = query.eq('faculty_id', facultyId);
    }

    // Filter by department at DB level for non-admin users
    if (user.role !== 'admin' && user.role !== 'college_admin' && user.department_id) {
      query = query.eq('faculty.department_id', user.department_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching qualifications:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch qualifications',
        details: error.message
      }, { status: 500 });
    }

    const filteredData = data || [];
    if (user.role !== 'admin' && user.role !== 'college_admin' && user.department_id) {
      console.log(`🔍 Filtered to ${filteredData.length} qualifications for department ${user.department_id}`);
    }

    console.log(`✅ Found ${filteredData.length} qualifications`);

    return NextResponse.json({
      success: true,
      qualifications: filteredData
    });

  } catch (error: any) {
    console.error('❌ Exception in GET /api/faculty/qualifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// POST: Add new faculty-subject qualification
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin', 'faculty', 'creator', 'publisher'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only admins can create qualifications.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      faculty_id,
      subject_id,
      proficiency_level = 7,
      preference_score = 5,
      teaching_load_weight = 1.0,
      is_primary_teacher = false,
      can_handle_lab = true,
      can_handle_tutorial = true
    } = body;

    console.log('📥 Adding faculty qualification:', {
      faculty_id,
      subject_id,
      proficiency_level
    });

    // Validate required fields
    if (!faculty_id || !subject_id) {
      return NextResponse.json({
        success: false,
        error: 'faculty_id and subject_id are required'
      }, { status: 400 });
    }

    // Parallelize all 3 validation queries
    const [{ data: facultyCheck, error: facultyError }, { data: subjectCheck, error: subjectError }, { data: existing }] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, role, college_id')
        .eq('id', faculty_id)
        .eq('college_id', user.college_id)
        .maybeSingle(),
      supabaseAdmin
        .from('subjects')
        .select('id, name, code, college_id')
        .eq('id', subject_id)
        .eq('college_id', user.college_id)
        .maybeSingle(),
      supabaseAdmin
        .from('faculty_qualified_subjects')
        .select('id')
        .eq('faculty_id', faculty_id)
        .eq('subject_id', subject_id)
        .maybeSingle()
    ]);

    if (facultyError || !facultyCheck) {
      console.error('❌ Faculty not found:', faculty_id, facultyError);
      return NextResponse.json({
        success: false,
        error: 'Selected faculty not found in your college'
      }, { status: 404 });
    }

    // Verify subject exists and belongs to user's college
    if (subjectError || !subjectCheck) {
      console.error('❌ Subject not found:', subject_id, subjectError);
      return NextResponse.json({
        success: false,
        error: 'Selected subject not found in your college'
      }, { status: 404 });
    }

    console.log('✅ Validation passed - Faculty:', facultyCheck.first_name, facultyCheck.last_name, '| Subject:', subjectCheck.name);

    // Check if qualification already exists
    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'This faculty is already qualified for this subject'
      }, { status: 409 });
    }

    // Insert new qualification
    const { data, error } = await supabaseAdmin
      .from('faculty_qualified_subjects')
      .insert({
        faculty_id,
        subject_id,
        proficiency_level,
        preference_score,
        teaching_load_weight,
        is_primary_teacher,
        can_handle_lab,
        can_handle_tutorial
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding qualification:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false,
        error: 'Failed to add qualification',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    // Fetch the complete record with relations
    const { data: completeData } = await supabaseAdmin
      .from('faculty_qualified_subjects')
      .select(`
        *,
        faculty:users(
          id,
          first_name,
          last_name,
          email
        ),
        subject:subjects(
          id,
          name,
          code,
          semester
        )
      `)
      .eq('id', data.id)
      .single();

    console.log('✅ Qualification added successfully');

    return NextResponse.json({
      success: true,
      qualification: completeData || data
    });

  } catch (error: any) {
    console.error('❌ Exception in POST /api/faculty/qualifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE: Remove faculty-subject qualification
export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin', 'faculty', 'creator', 'publisher'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Qualification ID is required'
      }, { status: 400 });
    }

    console.log('📥 Deleting qualification:', id);

    const { error } = await supabaseAdmin
      .from('faculty_qualified_subjects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting qualification:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete qualification',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Qualification deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Qualification deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Exception in DELETE /api/faculty/qualifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
