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

  const cacheKeyParts = [collegeId, 'batches', 'list'];
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
      const countResult = await pool.query(
        `SELECT COUNT(*) FROM batches WHERE college_id = $1 AND is_active = true`,
        [collegeId]
      );
      const count = parseInt(countResult.rows[0].count, 10);

      const params: any[] = [collegeId];
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
        WHERE b.college_id = $1 AND b.is_active = true
        ORDER BY b.created_at DESC
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
  const { name, department_id, year, semester } = body;

  if (!name || !department_id) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

    const { data, error } = await supabase
    .from('batches')
    .insert({
      name,
      department_id,
      college_id: user.college_id,
      year: year || new Date().getFullYear(),
      semester: semester || 1,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Invalidate cache
  const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');
  await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'batches', 'list') + '*');

  return NextResponse.json({ success: true, batch: data }, { status: 201 });
});