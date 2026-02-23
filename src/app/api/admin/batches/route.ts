import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { authenticate } from '@/shared/middleware/auth';
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = await authenticate(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

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

  const result = await withCacheAside(
    { key: cacheKey, ttl: 1800 },
    async () => {
      const supabase = createClient();
      let query = supabase
        .from('batches')
        .select(`
          *,
          departments (id, name, code)
        `, { count: 'exact' })
        .eq('college_id', collegeId)
        .eq('is_active', true);

      if (isPaginated && page && limit) {
        const { from, to } = getPaginationRange(page, limit);
        query = query.range(from, to);
      }

      const { data, count, error } = await query.order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return { batches: data || [], count: count || 0 };
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
  const user = await authenticate(request);
  if (!user || !['admin', 'college_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { name, department_id, year, semester } = body;

  if (!name || !department_id) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient();
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