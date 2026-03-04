import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

// GET - Fetch batches filtered by department_id, college_id, or user's own department
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('department_id');
    const collegeId = searchParams.get('college_id');
    const departmentCode = searchParams.get('department_code');

    const pool = getPool();
    const params: any[] = [];
    let where = 'WHERE b.is_active = true';

    if (departmentId) {
      params.push(departmentId);
      where += ` AND b.department_id = $${params.length}`;
    } else if (collegeId) {
      params.push(collegeId);
      where += ` AND b.college_id = $${params.length}`;
    } else if (departmentCode) {
      // look up department by code first
      const { rows: deptRows } = await pool.query(
        `SELECT id FROM departments WHERE code = $1 LIMIT 1`, [departmentCode]
      );
      if (deptRows[0]) {
        params.push(deptRows[0].id);
        where += ` AND b.department_id = $${params.length}`;
      }
    } else if (user.role !== 'admin' && user.department_id) {
      params.push(user.department_id);
      where += ` AND b.department_id = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT
        b.id, b.name, b.semester, b.academic_year, b.section, b.division,
        b.department_id, b.college_id, b.course_id,
        b.expected_strength, b.actual_strength,
        b.actual_strength AS strength,
        b.max_hours_per_day, b.preferred_start_time, b.preferred_end_time,
        b.is_active, b.created_at, b.class_coordinator,
        CASE WHEN d.id IS NOT NULL THEN
          json_build_object('name', d.name, 'code', d.code)
        ELSE NULL END AS departments,
        CASE WHEN c.id IS NOT NULL THEN
          json_build_object('title', c.title, 'code', c.code)
        ELSE NULL END AS courses,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', eb.id,
            'bucket_name', eb.bucket_name,
            'min_selection', eb.min_selection,
            'max_selection', eb.max_selection,
            'is_common_slot', eb.is_common_slot,
            'subjects', COALESCE((
              SELECT json_agg(json_build_object(
                'id', s.id, 'name', s.name, 'code', s.code,
                'credits', s.credits_per_week
              ))
              FROM bucket_subjects bs
              JOIN subjects s ON s.id = bs.subject_id
              WHERE bs.bucket_id = eb.id
            ), '[]'::json)
          ))
          FROM elective_buckets eb
          WHERE eb.batch_id = b.id
        ), '[]'::json) AS elective_buckets
      FROM batches b
      LEFT JOIN departments d ON d.id = b.department_id
      LEFT JOIN courses c ON c.id = b.course_id
      ${where}
      ORDER BY b.semester ASC, b.section ASC
      LIMIT 500`,
      params
    );

    return NextResponse.json({
      success: true,
      data: rows,
      batches: rows,
      count: rows.length,
      statistics: {
        totalBatches: rows.length,
        totalStudents: rows.reduce((s: number, b: any) => s + (b.actual_strength || 0), 0)
      },
      meta: { total: rows.length }
    });
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', data: [] }, { status: 500 });
  }
}

// POST - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const {
      name, semester, academic_year, section, division,
      expected_strength, actual_strength, department_id, department_code
    } = body;

    if (!name || !semester) {
      return NextResponse.json({ success: false, error: 'name and semester are required' }, { status: 400 });
    }

    const pool = getPool();
    let deptId = department_id;
    let colId: string | null = null;

    if (!deptId && department_code) {
      const { rows } = await pool.query(
        `SELECT id, college_id FROM departments WHERE code = $1 LIMIT 1`, [department_code]
      );
      if (!rows[0]) return NextResponse.json({ success: false, error: 'Department not found' }, { status: 400 });
      deptId = rows[0].id;
      colId = rows[0].college_id;
    }

    if (!deptId) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 400 });
    }

    if (!colId) {
      const { rows } = await pool.query(`SELECT college_id FROM departments WHERE id = $1`, [deptId]);
      colId = rows[0]?.college_id || null;
    }

    const { rows } = await pool.query(
      `INSERT INTO batches (id, name, college_id, department_id, semester, academic_year, section, division,
        expected_strength, actual_strength, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING *`,
      [name, colId, deptId, semester, academic_year || null, section || 'A', division || null,
       expected_strength || 60, actual_strength || 0]
    );

    return NextResponse.json({ success: true, data: rows[0], message: 'Batch created successfully' });
  } catch (error: any) {
    console.error('Error creating batch:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft-delete a batch
export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('id');

    if (!batchId) {
      return NextResponse.json({ success: false, error: 'Batch ID is required' }, { status: 400 });
    }

    const pool = getPool();
    await pool.query(`UPDATE batches SET is_active = false WHERE id = $1`, [batchId]);

    return NextResponse.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting batch:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
