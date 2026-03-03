import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const batchId = searchParams.get('batchId');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const pool = getPool();
    const params: any[] = [courseId];
    let sql = `
      SELECT
        gt.id, gt.title, gt.academic_year, gt.semester, gt.fitness_score,
        gt.created_at, gt.approved_at, gt.batch_id,
        json_build_object(
          'id', b.id, 'name', b.name, 'section', b.section,
          'semester', b.semester, 'academic_year', b.academic_year, 'course_id', b.course_id
        ) AS batches
      FROM generated_timetables gt
      INNER JOIN batches b ON b.id = gt.batch_id
      WHERE gt.status = 'published' AND b.course_id = $1
    `;

    if (semester) {
      params.push(parseInt(semester));
      sql += ` AND gt.semester = $${params.length}`;
    }
    if (batchId) {
      params.push(batchId);
      sql += ` AND gt.batch_id = $${params.length}`;
    }

    sql += ` ORDER BY gt.approved_at DESC NULLS LAST, gt.created_at DESC`;

    const [ttResult, batchesResult] = await Promise.all([
      pool.query(sql, params),
      pool.query(
        `SELECT id, name, section, semester, academic_year FROM batches WHERE course_id = $1 AND is_active = true ORDER BY semester, section`,
        [courseId]
      )
    ]);

    return NextResponse.json({
      success: true,
      timetables: ttResult.rows,
      batches: batchesResult.rows
    });

  } catch (error: any) {
    console.error('Error in published-timetables API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

