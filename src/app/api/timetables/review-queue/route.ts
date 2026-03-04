import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.faculty_type !== 'publisher') {
      return NextResponse.json(
        { success: false, error: 'Only publishers can access the review queue.' },
        { status: 403 }
      );
    }

    if (!user.department_id) {
      return NextResponse.json(
        { success: false, error: 'No department assigned to user.' },
        { status: 400 }
      );
    }

    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT
        gt.id,
        gt.title,
        gt.batch_id,
        gt.semester,
        gt.academic_year,
        gt.status,
        gt.fitness_score,
        gt.created_at,
        gt.created_by,
        b.name AS batch_name,
        u.first_name || ' ' || u.last_name AS creator_name,
        u.email AS creator_email,
        COALESCE((
          SELECT COUNT(*) FROM scheduled_classes sc WHERE sc.timetable_id = gt.id
        ), 0)::int AS class_count
      FROM generated_timetables gt
      INNER JOIN batches b ON b.id = gt.batch_id
      LEFT JOIN users u ON u.id = gt.created_by
      WHERE b.department_id = $1
        AND gt.status = 'pending_approval'
      ORDER BY gt.created_at DESC`,
      [user.department_id]
    );

    return NextResponse.json({
      success: true,
      timetables: rows,
      count: rows.length
    });
  } catch (error: any) {
    console.error('Error fetching review queue:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
