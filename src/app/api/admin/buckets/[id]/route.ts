import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const allowedRoles = ['college_admin', 'admin', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const pool = getPool();

    const result = await pool.query(`
      SELECT eb.*,
        CASE WHEN b.id IS NOT NULL THEN
          json_build_object(
            'id', b.id, 'name', b.name, 'semester', b.semester, 'section', b.section,
            'academic_year', b.academic_year, 'department_id', b.department_id
          )
        ELSE NULL END AS batches,
        COALESCE((
          SELECT json_agg(json_build_object(
            'subject_id', bs.subject_id,
            'subjects', json_build_object('id', s.id, 'code', s.code, 'name', s.name,
              'semester', s.semester, 'department_id', s.department_id, 'credit_value', s.credit_value)
          ))
          FROM bucket_subjects bs
          JOIN subjects s ON s.id = bs.subject_id
          WHERE bs.bucket_id = eb.id
        ), '[]'::json) AS bucket_subjects
      FROM elective_buckets eb
      LEFT JOIN batches b ON b.id = eb.batch_id
      WHERE eb.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { bucket_name, batch_id, min_selection, max_selection, is_common_slot, subject_ids } = body;

    const pool = getPool();

    const updateResult = await pool.query(`
      UPDATE elective_buckets
      SET bucket_name = $1, batch_id = $2, min_selection = $3, max_selection = $4,
          is_common_slot = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [bucket_name, batch_id, min_selection, max_selection, is_common_slot, id]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    const bucket = updateResult.rows[0];

    if (subject_ids !== undefined) {
      await pool.query(`DELETE FROM bucket_subjects WHERE bucket_id = $1`, [id]);
      if (subject_ids.length > 0) {
        const subjectValues = subject_ids.map((_: string, i: number) =>
          `($1, $${i + 2})`
        ).join(', ');
        await pool.query(
          `INSERT INTO bucket_subjects (bucket_id, subject_id) VALUES ${subjectValues} ON CONFLICT DO NOTHING`,
          [id, ...subject_ids]
        );
      }
    }

    return NextResponse.json({ success: true, bucket });
  } catch (error: any) {
    console.error('Error updating bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { id } = await params;
    const pool = getPool();

    await pool.query(`DELETE FROM bucket_subjects WHERE bucket_id = $1`, [id]);
    await pool.query(`DELETE FROM elective_buckets WHERE id = $1`, [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
