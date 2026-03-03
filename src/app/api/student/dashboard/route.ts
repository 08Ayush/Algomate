import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    const pool = getPool();

    // 1. Fetch user with course and college info
    const userResult = await pool.query(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.faculty_type,
        u.current_semester, u.college_uid, u.course_id, u.college_id,
        CASE WHEN c.id IS NOT NULL
          THEN json_build_object('id', c.id, 'title', c.title, 'code', c.code, 'nature_of_course', c.nature_of_course)
          ELSE NULL END AS course,
        CASE WHEN col.id IS NOT NULL
          THEN json_build_object('id', col.id, 'name', col.name)
          ELSE NULL END AS college
      FROM users u
      LEFT JOIN courses c ON c.id = u.course_id
      LEFT JOIN colleges col ON col.id = u.college_id
      WHERE u.id = $1
    `, [userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userResult.rows[0];
    const collegeId = userData.college_id;
    const courseId = userData.course_id;
    const semester = userData.current_semester || 1;

    // 2. Check explicit batch enrollment first
    const enrollResult = await pool.query(
      `SELECT batch_id FROM student_batch_enrollment WHERE student_id = $1 AND is_active = true LIMIT 1`,
      [userId]
    );

    let batchData: any = null;
    if (enrollResult.rows.length > 0) {
      const batchId = enrollResult.rows[0].batch_id;
      const batchResult = await pool.query(`
        SELECT b.id, b.name, b.section, b.semester, b.academic_year, b.actual_strength,
          b.course_id, b.department_id,
          CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'code', c.code) ELSE NULL END AS course,
          CASE WHEN d.id IS NOT NULL THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code) ELSE NULL END AS departments
        FROM batches b
        LEFT JOIN courses c ON c.id = b.course_id
        LEFT JOIN departments d ON d.id = b.department_id
        WHERE b.id = $1
      `, [batchId]);
      batchData = batchResult.rows[0] || null;
    } else if (courseId) {
      // Fallback: match by course and semester
      const batchResult = await pool.query(`
        SELECT b.id, b.name, b.section, b.semester, b.academic_year, b.actual_strength,
          b.course_id, b.department_id,
          CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'code', c.code) ELSE NULL END AS course,
          CASE WHEN d.id IS NOT NULL THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code) ELSE NULL END AS departments
        FROM batches b
        LEFT JOIN courses c ON c.id = b.course_id
        LEFT JOIN departments d ON d.id = b.department_id
        WHERE b.college_id = $1 AND b.course_id = $2 AND b.semester = $3 AND b.is_active = true
        LIMIT 1
      `, [collegeId, courseId, semester]);
      batchData = batchResult.rows[0] || null;
    }

    // 3. Faculty count for the course
    let facultyCount = 0;
    if (courseId) {
      const fcResult = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM users WHERE course_id = $1 AND role = 'faculty' AND is_active = true`,
        [courseId]
      );
      facultyCount = fcResult.rows[0]?.cnt || 0;
    }

    // 4. Fetch events for the batch's department
    let events: any[] = [];
    if (batchData?.department_id) {
      const eventsResult = await pool.query(`
        SELECT e.id, e.title, e.description, e.event_type, e.event_date, e.event_time,
          e.end_time, e.location, e.status, e.created_by,
          CASE WHEN u.id IS NOT NULL
            THEN json_build_object('first_name', u.first_name, 'last_name', u.last_name, 'faculty_type', u.faculty_type)
            ELSE NULL END AS creator
        FROM events e
        LEFT JOIN users u ON u.id = e.created_by
        WHERE e.department_id = $1 AND e.status IN ('draft', 'published')
        ORDER BY e.event_date DESC LIMIT 10
      `, [batchData.department_id]);
      events = eventsResult.rows.map((ev: any) => ({
        ...ev,
        start_date: ev.event_date,
        start_time: ev.event_time,
        venue: ev.location
      }));
    }

    const additionalData = {
      batch: batchData,
      batchId: batchData?.id || null,
      facultyCount,
      events
    };

    return NextResponse.json({
      success: true,
      user: userData,
      additionalData,
      events
    });

  } catch (error: any) {
    console.error('Error in student dashboard API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
