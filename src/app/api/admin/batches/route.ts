import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { requireAuth } from '@/lib/auth';
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';
import { getPool } from '@/lib/db';

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user; // Auth failed

  const { searchParams } = new URL(request.url);
  const collegeId = searchParams.get('college_id') || user.college_id;
  const { page, limit, isPaginated } = getPaginationParams(request);

  if (!collegeId) {
    return NextResponse.json({ success: false, error: 'College ID is required' }, { status: 400 });
  }

  const { withCacheAside } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');

  const includeInactive = searchParams.get('include_inactive') === 'true';

  const cacheKeyParts = [collegeId, 'batches', includeInactive ? 'all' : 'list'];
  if (isPaginated) cacheKeyParts.push(`p:${page}:l:${limit}`);
  const cacheKey = redisCache.buildKey(cacheKeyParts[0], cacheKeyParts[1], cacheKeyParts[2], cacheKeyParts.slice(3).join(':') || undefined);

  const forceRefresh = searchParams.get('refresh') === '1';
  if (forceRefresh) {
    const { invalidateCache } = await import('@/shared/cache/cache-helper');
    await invalidateCache(cacheKey);
  }

  const result = await withCacheAside(
    { key: cacheKey, ttl: 1800 },
    async () => {
      const pool = getPool();
      const activeFilter = includeInactive ? '' : 'AND is_active = true';
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM batches WHERE college_id = $1 ${activeFilter}`,
        [collegeId]
      );
      const count = parseInt(countResult.rows[0].count, 10);

      const params: any[] = [collegeId];
      const activeJoinFilter = includeInactive ? '' : 'AND b.is_active = true';
      let sql = `
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
        WHERE b.college_id = $1 ${activeJoinFilter}
        ORDER BY b.is_active DESC, b.created_at DESC
      `;

      if (isPaginated && page && limit) {
        const offset = (page - 1) * limit;
        sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
      }

      const { rows } = await pool.query(sql, params);
      return { batches: rows, count };
    }
  );

  if (isPaginated && page && limit) {
    const paginatedResult = createPaginatedResponse(result.batches, result.count, page, limit);
    return NextResponse.json({
      success: true,
      batches: paginatedResult.data,
      meta: paginatedResult.meta
    });
  }

  return NextResponse.json({
    success: true,
    batches: result.batches,
    meta: { total: result.count }
  });
});

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { name, department_id, course_id, semester, section, academic_year, expected_strength, actual_strength, is_active } = body;

  if (!department_id || !semester || !academic_year) {
    return NextResponse.json({ success: false, error: 'department_id, semester, and academic_year are required' }, { status: 400 });
  }

  const pool = getPool();

  // Verify department belongs to this college
  const deptResult = await pool.query(
    `SELECT code FROM departments WHERE id = $1 AND college_id = $2`,
    [department_id, user.college_id]
  );
  if (deptResult.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Department not found in your college' }, { status: 400 });
  }

  // Use provided name or auto-generate: e.g. "CSE-Sem3-A"
  const deptCode = deptResult.rows[0].code || 'BATCH';
  const batchSection = section || 'A';
  const batchName = (name && name.trim()) ? name.trim() : `${deptCode}-Sem${semester}-${batchSection}`;

  const insertResult = await pool.query(`
    INSERT INTO batches
      (name, department_id, course_id, college_id, semester, section, academic_year, expected_strength, actual_strength, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [
    batchName, department_id, course_id || null, user.college_id,
    semester, batchSection, academic_year,
    expected_strength ?? 60, actual_strength ?? 0, is_active !== undefined ? is_active : true
  ]);

  // Invalidate both cache keys (list = active only, all = include inactive)
  const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');
  await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'list') + '*');
  await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'all') + '*');

  return NextResponse.json({ success: true, batch: insertResult.rows[0] }, { status: 201 });
});

export const DELETE = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'Batch ID is required' }, { status: 400 });

  const pool = getPool();
  const result = await pool.query(
    `UPDATE batches SET is_active = false, updated_at = NOW() WHERE id = $1 AND college_id = $2 RETURNING id`,
    [id, user.college_id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ success: false, error: 'Batch not found' }, { status: 404 });
  }

  const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');
  await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'list') + '*');

  return NextResponse.json({ success: true, message: 'Batch deleted' });
});