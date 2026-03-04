import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const pool = getPool();

    // Fetch subjects the faculty is qualified to teach
    const { rows: subjects } = await pool.query(
      `SELECT
        s.id,
        s.name,
        s.code,
        s.subject_type,
        s.semester,
        s.credits_per_week,
        s.requires_lab,
        s.is_active,
        fqs.proficiency_level,
        fqs.is_primary_teacher,
        fqs.can_handle_lab,
        CASE WHEN d.id IS NOT NULL
          THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code)
          ELSE NULL
        END AS departments
      FROM faculty_qualified_subjects fqs
      INNER JOIN subjects s ON s.id = fqs.subject_id
      LEFT JOIN departments d ON d.id = s.department_id
      WHERE fqs.faculty_id = $1
        AND s.college_id = $2
        AND s.is_active = true
      ORDER BY s.name`,
      [user.id, user.college_id]
    );

    // Fetch batches in the faculty's department (for assignment dropdown)
    const { rows: batches } = await pool.query(
      `SELECT
        b.id, b.name, b.semester, b.section, b.academic_year,
        b.expected_strength, b.actual_strength, b.department_id,
        CASE WHEN d.id IS NOT NULL THEN
          json_build_object('name', d.name, 'code', d.code)
        ELSE NULL END AS departments
      FROM batches b
      LEFT JOIN departments d ON d.id = b.department_id
      WHERE b.college_id = $1
        AND b.is_active = true
        ${user.department_id ? 'AND b.department_id = $2' : ''}
      ORDER BY b.semester ASC, b.name ASC
      LIMIT 200`,
      user.department_id ? [user.college_id, user.department_id] : [user.college_id]
    );

    return NextResponse.json({ success: true, subjects, batches });
  } catch (error: any) {
    console.error('Error in GET /api/faculty/assigned-subjects-batches:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


