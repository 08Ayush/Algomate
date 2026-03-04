import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, department_id, course_id, semester, section, academic_year, expected_strength, actual_strength, is_active } = body;

    if (!department_id || !semester || !academic_year) {
      return NextResponse.json({ success: false, error: 'department_id, semester, and academic_year are required' }, { status: 400 });
    }

    const pool = getPool();

    // Verify batch belongs to this college
    const existing = await pool.query(
      `SELECT id FROM batches WHERE id = $1 AND college_id = $2`,
      [id, user.college_id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Batch not found in your college' }, { status: 404 });
    }

    // Verify department belongs to this college
    const deptResult = await pool.query(
      `SELECT code FROM departments WHERE id = $1 AND college_id = $2`,
      [department_id, user.college_id]
    );
    if (deptResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Department not found in your college' }, { status: 400 });
    }

    // Re-generate batch name from updated fields
    const deptCode = deptResult.rows[0].code || 'BATCH';
    const batchSection = section || 'A';
    const batchName = (name && name.trim()) ? name.trim() : `${deptCode}-Sem${semester}-${batchSection}`;

    const updateResult = await pool.query(`
      UPDATE batches SET
        name = $1, department_id = $2, course_id = $3,
        semester = $4, section = $5, academic_year = $6,
        expected_strength = $7, actual_strength = $8,
        is_active = $9, updated_at = NOW()
      WHERE id = $10 AND college_id = $11
      RETURNING *
    `, [
      batchName, department_id, course_id || null,
      semester, batchSection, academic_year,
      expected_strength ?? 60, actual_strength ?? 0,
      is_active !== undefined ? is_active : true,
      id, user.college_id
    ]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Failed to update batch' }, { status: 500 });
    }

    // Re-fetch with department + course JOINs
    const fetchResult = await pool.query(`
      SELECT b.*,
        CASE WHEN d.id IS NOT NULL
          THEN json_build_object('id', d.id, 'name', d.name, 'code', d.code)
          ELSE NULL END AS departments,
        CASE WHEN c.id IS NOT NULL
          THEN json_build_object('id', c.id, 'title', c.title, 'code', c.code)
          ELSE NULL END AS courses
      FROM batches b
      LEFT JOIN departments d ON d.id = b.department_id
      LEFT JOIN courses c ON c.id = b.course_id
      WHERE b.id = $1
    `, [id]);

    try {
      const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
      const { redisCache } = await import('@/shared/cache/redis-cache');
      await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'list') + '*');
      await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'all') + '*');
    } catch { /* cache invalidation is best-effort */ }

    return NextResponse.json({ success: true, batch: fetchResult.rows[0] });

  } catch (error: any) {
    console.error('Batch update error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { is_active } = body;

    if (typeof is_active !== 'boolean') {
      return NextResponse.json({ success: false, error: 'is_active (boolean) is required' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE batches SET is_active = $1, updated_at = NOW() WHERE id = $2 AND college_id = $3 RETURNING id, is_active`,
      [is_active, id, user.college_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    try {
      const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
      const { redisCache } = await import('@/shared/cache/redis-cache');
      await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'list') + '*');
      await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'all') + '*');
    } catch { /* best-effort */ }

    return NextResponse.json({ success: true, batch: result.rows[0] });

  } catch (error: any) {
    console.error('Batch toggle error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE batches SET is_active = false, updated_at = NOW() WHERE id = $1 AND college_id = $2 RETURNING id`,
      [id, user.college_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
    }

    try {
      const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
      const { redisCache } = await import('@/shared/cache/redis-cache');
      await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'list') + '*');
      await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'all') + '*');
    } catch { /* best-effort */ }

    return NextResponse.json({ success: true, message: 'Batch deleted' });

  } catch (error: any) {
    console.error('Batch delete error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
