import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const pool = getPool();

    // User with course (direct or via batch) and college
    const userResult = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
        u.college_uid, u.student_id, u.current_semester, u.admission_year,
        u.cgpa, u.course_id, u.college_id, u.department_id, u.role,
        CASE WHEN COALESCE(c.id, bc.id) IS NOT NULL
          THEN json_build_object('id', COALESCE(c.id, bc.id), 'title', COALESCE(c.title, bc.title),
               'code', COALESCE(c.code, bc.code), 'nature_of_course', COALESCE(c.nature_of_course, bc.nature_of_course))
          ELSE NULL END AS course,
        CASE WHEN col.id IS NOT NULL
          THEN json_build_object('id', col.id, 'name', col.name)
          ELSE NULL END AS college
      FROM users u
      LEFT JOIN courses c ON c.id = u.course_id
      LEFT JOIN colleges col ON col.id = u.college_id
      LEFT JOIN LATERAL (
        SELECT b.course_id FROM student_batch_enrollment sbe
        JOIN batches b ON b.id = sbe.batch_id
        WHERE sbe.student_id = u.id AND sbe.is_active = true
        ORDER BY sbe.created_at DESC LIMIT 1
      ) enroll ON true
      LEFT JOIN courses bc ON bc.id = enroll.course_id AND u.course_id IS NULL
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const profile = userResult.rows[0];

    // Batch enrollment
    const enrollResult = await pool.query(
      `SELECT batch_id FROM student_batch_enrollment WHERE student_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    let batchInfo: any = null;
    let departmentInfo: any = null;

    if (enrollResult.rows.length > 0) {
      const batchResult = await pool.query(`
        SELECT b.id, b.name, b.semester, b.section, b.academic_year, b.department_id, b.course_id,
          CASE WHEN d.id IS NOT NULL
            THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code)
            ELSE NULL END AS departments,
          CASE WHEN bc.id IS NOT NULL
            THEN json_build_object('id', bc.id, 'title', bc.title, 'code', bc.code, 'nature_of_course', bc.nature_of_course)
            ELSE NULL END AS course
        FROM batches b
        LEFT JOIN departments d ON d.id = b.department_id
        LEFT JOIN courses bc ON bc.id = b.course_id
        WHERE b.id = $1
      `, [enrollResult.rows[0].batch_id]);

      if (batchResult.rows.length > 0) {
        const b = batchResult.rows[0];
        batchInfo = { id: b.id, name: b.name, semester: b.semester, section: b.section, academic_year: b.academic_year };
        if (b.departments) departmentInfo = b.departments;
        // Use batch course as fallback if user has no direct course_id
        if (!profile.course && b.course) profile.course = b.course;
      }
    }

    // Fallback: department from user's department_id
    if (!departmentInfo && profile.department_id) {
      const deptResult = await pool.query(
        `SELECT id, name, code FROM departments WHERE id = $1`,
        [profile.department_id]
      );
      if (deptResult.rows.length > 0) departmentInfo = deptResult.rows[0];
    }

    return NextResponse.json({
      success: true,
      profile: { ...profile, department: departmentInfo, batch: batchInfo }
    });

  } catch (error: any) {
    console.error('Error in student profile GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { userId, first_name, last_name, phone, cgpa } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const pool = getPool();
    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];

    if (first_name !== undefined) { params.push(first_name); updates.push(`first_name = $${params.length}`); }
    if (last_name !== undefined)  { params.push(last_name);  updates.push(`last_name = $${params.length}`); }
    if (phone !== undefined)      { params.push(phone);      updates.push(`phone = $${params.length}`); }
    if (cgpa !== undefined)       { params.push(cgpa);       updates.push(`cgpa = $${params.length}`); }

    params.push(userId);
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Re-fetch with JOINs so course and college objects are included
    // Use COALESCE between user's direct course and their batch's course
    const profileResult = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
        u.college_uid, u.student_id, u.current_semester, u.admission_year,
        u.cgpa, u.course_id, u.college_id, u.department_id, u.role,
        CASE WHEN COALESCE(c.id, bc.id) IS NOT NULL
          THEN json_build_object('id', COALESCE(c.id, bc.id), 'title', COALESCE(c.title, bc.title),
               'code', COALESCE(c.code, bc.code), 'nature_of_course', COALESCE(c.nature_of_course, bc.nature_of_course))
          ELSE NULL END AS course,
        CASE WHEN col.id IS NOT NULL
          THEN json_build_object('id', col.id, 'name', col.name)
          ELSE NULL END AS college
      FROM users u
      LEFT JOIN courses c ON c.id = u.course_id
      LEFT JOIN colleges col ON col.id = u.college_id
      LEFT JOIN LATERAL (
        SELECT b.course_id FROM student_batch_enrollment sbe
        JOIN batches b ON b.id = sbe.batch_id
        WHERE sbe.student_id = u.id AND sbe.is_active = true
        ORDER BY sbe.created_at DESC LIMIT 1
      ) enroll ON true
      LEFT JOIN courses bc ON bc.id = enroll.course_id AND u.course_id IS NULL
      WHERE u.id = $1
    `, [userId]);

    return NextResponse.json({ success: true, profile: profileResult.rows[0] });

  } catch (error: any) {
    console.error('Error in student profile PATCH:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

