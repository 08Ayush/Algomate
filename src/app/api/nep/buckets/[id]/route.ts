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

    const { id } = await params;
    const pool = getPool();

    const result = await pool.query(`
      SELECT eb.*,
        COALESCE((
          SELECT json_agg(json_build_object('id', s.id, 'code', s.code, 'name', s.name,
            'credits_per_week', s.credits_per_week, 'semester', s.semester,
            'subject_type', s.subject_type, 'nep_category', s.nep_category, 'course_group_id', s.course_group_id))
          FROM bucket_subjects bs JOIN subjects s ON s.id = bs.subject_id
          WHERE bs.bucket_id = eb.id
        ), '[]'::json) AS subjects
      FROM elective_buckets eb
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

    const { id } = await params;
    const body = await request.json();
    const { bucket_name, batch_id, min_selection, max_selection, is_common_slot } = body;

    const pool = getPool();
    const result = await pool.query(`
      UPDATE elective_buckets
      SET bucket_name = COALESCE($1, bucket_name),
          batch_id = COALESCE($2, batch_id),
          min_selection = COALESCE($3, min_selection),
          max_selection = COALESCE($4, max_selection),
          is_common_slot = COALESCE($5, is_common_slot),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [bucket_name, batch_id, min_selection, max_selection, is_common_slot, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating bucket:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

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
