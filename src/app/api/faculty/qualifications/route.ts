import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

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
    const { data: dbUser, error } = await supabase
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

    // Use raw SQL with JOINs — compat layer doesn't support embedded relations
    const pool = getPool();
    const params: unknown[] = [user.college_id];
    let paramIdx = 1;

    let sql = `
      SELECT
        fqs.id,
        fqs.faculty_id,
        fqs.subject_id,
        fqs.proficiency_level,
        fqs.preference_score,
        fqs.teaching_load_weight,
        fqs.is_primary_teacher,
        fqs.can_handle_lab,
        fqs.can_handle_tutorial,
        fqs.created_at,
        json_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email,
          'course_id', u.course_id,
          'college_id', u.college_id,
          'department_id', u.department_id
        ) AS faculty,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'code', s.code,
          'subject_type', s.subject_type,
          'semester', s.semester,
          'credits_per_week', s.credits_per_week,
          'requires_lab', s.requires_lab,
          'course_id', s.course_id,
          'college_id', s.college_id,
          'department_id', s.department_id
        ) AS subject
      FROM faculty_qualified_subjects fqs
      INNER JOIN users u ON u.id = fqs.faculty_id
      INNER JOIN subjects s ON s.id = fqs.subject_id
      WHERE u.college_id = $${paramIdx}
        AND s.college_id = $${paramIdx}
    `;

    if (facultyId) {
      paramIdx++;
      params.push(facultyId);
      sql += ` AND fqs.faculty_id = $${paramIdx}`;
    } else if (user.role === 'faculty' && user.faculty_type !== 'creator' && user.faculty_type !== 'publisher') {
      // Regular faculty (general/guest) see only their own qualifications
      // Creator and publisher faculty see all qualifications in their college
      paramIdx++;
      params.push(user.id);
      sql += ` AND fqs.faculty_id = $${paramIdx}`;
    }

    // Admins/college_admins see the whole college; everyone else is scoped to their department
    const isCollegeWide = user.role === 'admin' || user.role === 'college_admin';
    if (!isCollegeWide && user.department_id) {
      paramIdx++;
      params.push(user.department_id);
      sql += ` AND u.department_id = $${paramIdx}`;
    }

    sql += ` ORDER BY fqs.created_at DESC`;

    const result = await pool.query(sql, params);
    const filteredData = result.rows;
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

// PATCH: Update faculty-subject qualification (toggle is_primary_teacher)
export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { qualification_id, is_primary_teacher } = body;

    if (!qualification_id || is_primary_teacher === undefined) {
      return NextResponse.json({ success: false, error: 'qualification_id and is_primary_teacher are required' }, { status: 400 });
    }

    const pool = getPool();
    // Verify the qualification belongs to this college (and to the faculty if role=faculty)
    const checkSql = user.role === 'faculty'
      ? `SELECT fqs.id FROM faculty_qualified_subjects fqs JOIN users u ON u.id = fqs.faculty_id WHERE fqs.id = $1 AND u.college_id = $2 AND fqs.faculty_id = $3`
      : `SELECT fqs.id FROM faculty_qualified_subjects fqs JOIN users u ON u.id = fqs.faculty_id WHERE fqs.id = $1 AND u.college_id = $2`;
    const checkParams = user.role === 'faculty' ? [qualification_id, user.college_id, user.id] : [qualification_id, user.college_id];
    const check = await pool.query(checkSql, checkParams);
    if (check.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Qualification not found or access denied' }, { status: 404 });
    }

    await pool.query(
      `UPDATE faculty_qualified_subjects SET is_primary_teacher = $1, updated_at = NOW() WHERE id = $2`,
      [is_primary_teacher, qualification_id]
    );

    return NextResponse.json({ success: true, message: 'Qualification updated' });
  } catch (error: any) {
    console.error('❌ Exception in PATCH /api/faculty/qualifications:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
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
      supabase
        .from('users')
        .select('id, first_name, last_name, role, college_id')
        .eq('id', faculty_id)
        .eq('college_id', user.college_id)
        .maybeSingle(),
      supabase
        .from('subjects')
        .select('id, name, code, college_id')
        .eq('id', subject_id)
        .eq('college_id', user.college_id)
        .maybeSingle(),
      supabase
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
    const { data, error } = await supabase
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

    // Fetch the complete record with relations using raw SQL
    const pool = getPool();
    const completeResult = await pool.query(`
      SELECT
        fqs.*,
        json_build_object(
          'id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name,
          'email', u.email
        ) AS faculty,
        json_build_object(
          'id', s.id,
          'name', s.name,
          'code', s.code,
          'semester', s.semester
        ) AS subject
      FROM faculty_qualified_subjects fqs
      INNER JOIN users u ON u.id = fqs.faculty_id
      INNER JOIN subjects s ON s.id = fqs.subject_id
      WHERE fqs.id = $1
    `, [data.id]);
    const completeData = completeResult.rows[0] || null;

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

    const { error } = await supabase
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
