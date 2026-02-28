import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { requireAuth } from '@/lib/auth';
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  if (!['super_admin', 'admin', 'college_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { page, limit, isPaginated } = getPaginationParams(request);
  const { withCacheAside } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');

  // College admins can only see their own college
  if (user.role === 'college_admin') {
    if (!user.college_id) {
      return NextResponse.json({ success: false, error: 'No college assigned' }, { status: 400 });
    }

    const cacheKey = redisCache.buildKey(user.college_id, 'admin', 'colleges', 'single');
    const college = await withCacheAside(
      { key: cacheKey, ttl: 3600 },
      async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('colleges')
          .select('*')
          .eq('id', user.college_id)
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
    );

    return NextResponse.json({ success: true, colleges: [college], meta: { total: 1 } });
  }

  // Super admins and admins see all
  const cacheKey = redisCache.buildKey('global', 'admin', 'colleges', isPaginated ? `p:${page}:l:${limit}` : 'all');

  const result = await withCacheAside(
    { key: cacheKey, ttl: 3600 },
    async () => {
      const supabase = createClient();
      let query = supabase.from('colleges').select('*', { count: 'exact' });

      if (isPaginated && page && limit) {
        const { from, to } = getPaginationRange(page, limit);
        query = query.range(from, to);
      }

      const { data, count, error } = await query.order('name');
      if (error) throw new Error(error.message);
      return { colleges: data || [], count: count || 0 };
    }
  );

  if (isPaginated && page && limit) {
    const paginatedResult = createPaginatedResponse(result.colleges, result.count, page, limit);
    return NextResponse.json({
      success: true,
      colleges: paginatedResult.data,
      meta: paginatedResult.meta
    });
  }

  return NextResponse.json({ success: true, colleges: result.colleges, meta: { total: result.count } });
});

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  if (user.role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { name, code, address, email, phone } = body;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('colleges')
    .insert({ name, code, address, contact_email: email, contact_phone: phone })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Invalidate patterns
  const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');
  await invalidateCachePattern(redisCache.buildKey('global', 'admin', 'colleges') + '*');

  return NextResponse.json({ success: true, college: data }, { status: 201 });
});
