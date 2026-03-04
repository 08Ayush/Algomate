import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const departmentId = searchParams.get('departmentId');
    const fetchAll = searchParams.get('fetchAll');

    const pool = getPool();

    // Admin: fetch all buckets for the college
    if (fetchAll === 'true') {
      if (!['college_admin', 'admin', 'super_admin'].includes(user.role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const { rows } = await pool.query(`
        SELECT eb.*,
          COALESCE((
            SELECT json_agg(json_build_object('id', s.id, 'code', s.code, 'name', s.name,
              'credits_per_week', s.credits_per_week, 'semester', s.semester,
              'subject_type', s.subject_type, 'nep_category', s.nep_category))
            FROM bucket_subjects bs JOIN subjects s ON s.id = bs.subject_id
            WHERE bs.bucket_id = eb.id
          ), '[]'::json) AS subjects
        FROM elective_buckets eb
        WHERE eb.college_id = $1
        ORDER BY eb.created_at DESC
      `, [user.college_id]);

      return NextResponse.json(rows);
    }

    // Creator faculty: resolve batches by departmentId + semester (+optional courseId)
    // Show only buckets where is_live_for_creators = true
    const params: any[] = [user.college_id];
    let batchFilter = '';

    if (batchId) {
      params.push(batchId);
      batchFilter = `AND b.id = $${params.length}`;
    } else {
      if (departmentId) {
        params.push(departmentId);
        batchFilter += ` AND b.department_id = $${params.length}`;
      }
      if (semester) {
        params.push(parseInt(semester));
        batchFilter += ` AND b.semester = $${params.length}`;
      }
      if (courseId) {
        params.push(courseId);
        batchFilter += ` AND b.course_id = $${params.length}`;
      }
    }

    const { rows: buckets } = await pool.query(`
      SELECT eb.*,
        json_build_object(
          'id', b.id, 'name', b.name, 'semester', b.semester, 'section', b.section,
          'academic_year', b.academic_year, 'course_id', b.course_id, 'department_id', b.department_id,
          'is_active', b.is_active,
          'courses', CASE WHEN c.id IS NOT NULL THEN json_build_object('id', c.id, 'title', c.title, 'code', c.code) ELSE NULL END,
          'departments', CASE WHEN d.id IS NOT NULL THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code) ELSE NULL END
        ) AS batch_info,
        COALESCE((
          SELECT json_agg(json_build_object('id', s.id, 'code', s.code, 'name', s.name,
            'credits_per_week', s.credits_per_week, 'semester', s.semester,
            'subject_type', s.subject_type, 'nep_category', s.nep_category, 'course_group_id', s.course_group_id))
          FROM bucket_subjects bs JOIN subjects s ON s.id = bs.subject_id
          WHERE bs.bucket_id = eb.id
        ), '[]'::json) AS subjects
      FROM elective_buckets eb
      JOIN batches b ON b.id = eb.batch_id
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN departments d ON d.id = b.department_id
      WHERE eb.college_id = $1
        AND eb.is_live_for_creators = true
        AND b.is_active = true
        ${batchFilter}
      ORDER BY eb.created_at DESC
    `, params);

    return NextResponse.json(buckets);

  } catch (error: any) {
    console.error('Error in GET /api/nep/buckets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { bucket_name, batch_id, min_selection, max_selection, is_common_slot } = body;

    if (!bucket_name || !batch_id) {
      return NextResponse.json({ error: 'bucket_name and batch_id are required' }, { status: 400 });
    }

    const pool = getPool();

    const result = await pool.query(`
      INSERT INTO elective_buckets
        (bucket_name, batch_id, college_id, min_selection, max_selection, is_common_slot,
         is_published, is_live_for_creators, is_live_for_students, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, false, false, false, $7)
      RETURNING *
    `, [
      bucket_name, batch_id, user.college_id,
      min_selection || 1, max_selection || 1,
      is_common_slot !== false, user.id
    ]);

    const bucket = result.rows[0];

    try {
      if (user.department_id) {
        const { notifyNEPBucketCreated } = await import('@/lib/notificationService');
        await notifyNEPBucketCreated({
          bucketId: bucket.id,
          bucketName: bucket.bucket_name,
          departmentId: user.department_id,
          creatorId: user.id,
          creatorName: `${user.first_name || 'Admin'} ${user.last_name || ''}`.trim()
        });
      }
    } catch (notifError) {
      console.error('Failed to send bucket creation notification:', notifError);
    }

    return NextResponse.json(bucket);

  } catch (error: any) {
    console.error('Error in POST /api/nep/buckets:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}