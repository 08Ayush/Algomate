import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPaginationParams, createPaginatedResponse } from '@/shared/utils/pagination';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const allowedRoles = ['college_admin', 'admin', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    const collegeId = user.role === 'super_admin' ? queryCollegeId : user.college_id;

    if (!collegeId) {
      return NextResponse.json({ error: 'College ID is required' }, { status: 400 });
    }

    const pool = getPool();
    const { page, limit, isPaginated } = getPaginationParams(request);

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM elective_buckets WHERE college_id = $1`,
      [collegeId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const params: any[] = [collegeId];
    let sql = `
      SELECT eb.*,
        CASE WHEN b.id IS NOT NULL THEN
          json_build_object(
            'id', b.id, 'name', b.name, 'semester', b.semester, 'section', b.section,
            'academic_year', b.academic_year, 'department_id', b.department_id,
            'departments', CASE WHEN d.id IS NOT NULL THEN
              json_build_object('id', d.id, 'name', d.name, 'code', d.code)
            ELSE NULL END
          )
        ELSE NULL END AS batches,
        COALESCE((
          SELECT json_agg(json_build_object(
            'subject_id', bs.subject_id,
            'subjects', json_build_object('id', s.id, 'code', s.code, 'name', s.name,
              'semester', s.semester, 'department_id', s.department_id)
          ))
          FROM bucket_subjects bs
          JOIN subjects s ON s.id = bs.subject_id
          WHERE bs.bucket_id = eb.id
        ), '[]'::json) AS bucket_subjects
      FROM elective_buckets eb
      LEFT JOIN batches b ON b.id = eb.batch_id
      LEFT JOIN departments d ON d.id = b.department_id
      WHERE eb.college_id = $1
      ORDER BY eb.created_at DESC
    `;

    if (isPaginated && page && limit) {
      const offset = (page - 1) * limit;
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
    } else {
      sql += ` LIMIT 500`;
    }

    const { rows: buckets } = await pool.query(sql, params);

    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(buckets, total, page, limit);
      return NextResponse.json({ buckets: paginatedResult.data, meta: paginatedResult.meta });
    }

    return NextResponse.json({ buckets, meta: { total } });

  } catch (error: any) {
    console.error('Error fetching admin buckets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { bucket_name, batch_id, min_selection, max_selection, is_common_slot, subject_ids } = body;

    if (!bucket_name || !batch_id) {
      return NextResponse.json({ error: 'Bucket name and batch are required' }, { status: 400 });
    }

    const pool = getPool();

    const insertResult = await pool.query(`
      INSERT INTO elective_buckets
        (bucket_name, batch_id, college_id, min_selection, max_selection, is_common_slot,
         is_published, is_live_for_creators, is_live_for_students, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, false, false, false, $7)
      RETURNING *
    `, [
      bucket_name, batch_id, user.college_id,
      min_selection || 1, max_selection || 1,
      is_common_slot !== false,
      user.id
    ]);

    const bucket = insertResult.rows[0];

    if (subject_ids && subject_ids.length > 0) {
      const subjectValues = subject_ids.map((_: string, i: number) =>
        `($1, $${i + 2})`
      ).join(', ');
      await pool.query(
        `INSERT INTO bucket_subjects (bucket_id, subject_id) VALUES ${subjectValues} ON CONFLICT DO NOTHING`,
        [bucket.id, ...subject_ids]
      );
    }

    return NextResponse.json({ success: true, bucket });
  } catch (error: any) {
    console.error('Error creating bucket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
