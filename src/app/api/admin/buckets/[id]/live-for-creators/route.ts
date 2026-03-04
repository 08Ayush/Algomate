import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

/**
 * Make Bucket Live for Creators API
 * POST - Make bucket visible to departmental creators for adding subjects
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { is_live, admin_id } = body;

    const pool = getPool();

    if (is_live) {
      await pool.query(
        `UPDATE elective_buckets
         SET is_live_for_creators = true, creator_live_at = NOW(), creator_live_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [admin_id || user.id, id]
      );
    } else {
      await pool.query(
        `UPDATE elective_buckets
         SET is_live_for_creators = false, creator_live_at = NULL, creator_live_by = NULL, updated_at = NOW()
         WHERE id = $1`,
        [id]
      );
    }

    // Re-fetch with joins
    const result = await pool.query(`
      SELECT eb.*,
        json_build_object('id', b.id, 'name', b.name, 'semester', b.semester, 'section', b.section,
          'academic_year', b.academic_year, 'department_id', b.department_id, 'course_id', b.course_id,
          'departments', json_build_object('id', d.id, 'name', d.name, 'code', d.code),
          'courses', json_build_object('id', c.id, 'title', c.title, 'code', c.code)) AS batches
      FROM elective_buckets eb
      LEFT JOIN batches b ON b.id = eb.batch_id
      LEFT JOIN departments d ON d.id = b.department_id
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE eb.id = $1
    `, [id]);

    const bucket = result.rows[0] || null;

    return NextResponse.json({
      bucket,
      message: is_live
        ? 'Bucket is now live for departmental creators to add subjects'
        : 'Bucket is no longer live for creators'
    });

  } catch (error: any) {
    console.error('Error in bucket creator publish:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
