import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const pool = getPool();

    const { rows: subjects } = await pool.query(
      `
      SELECT
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
      ORDER BY s.name
      `,
      [user.id, user.college_id]
    );

    return NextResponse.json({ success: true, subjects });
  } catch (error: any) {
    console.error('Error in GET /api/faculty/assigned-subjects-batches:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

