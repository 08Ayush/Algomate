import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { requireAuth } from '@/lib/auth';

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

  const { searchParams } = new URL(request.url);
  const collegeId = searchParams.get('college_id') || user.college_id;
  const departmentId = searchParams.get('department_id');

  if (!collegeId) {
    return NextResponse.json({ success: false, error: 'College ID is required' }, { status: 400 });
  }

  const { withCacheAside } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');

  const cacheKeyParts = [collegeId, 'subjects', 'list'];
  if (departmentId) cacheKeyParts.push(`dept:${departmentId}`);
  const cacheKey = redisCache.buildKey(cacheKeyParts[0], cacheKeyParts[1], cacheKeyParts[2], cacheKeyParts.slice(3).join(':') || undefined);

  const subjects = await withCacheAside(
    { key: cacheKey, ttl: 1800 },
    async () => {
      const supabase = createClient();
      let query = supabase
        .from('subjects')
        .select(`
          *,
          departments (id, name, code)
        `)
        .eq('college_id', collegeId);

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query.order('name');
      if (error) throw new Error(error.message);
      return data || [];
    }
  );

  return NextResponse.json({ success: true, subjects });
});

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { name, code, credits_per_week, department_id, semester } = body;

  if (!name || !code || !department_id) {
    return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      name,
      code,
      credits_per_week: credits_per_week || 3,
      department_id,
      college_id: user.college_id,
      semester: semester || 1
    })
    .select()
    .single();

  if (error) {
    console.error('Subject creation error:', error);

    // Provide user-friendly error messages
    if (error.code === '23505') {
      return NextResponse.json({
        success: false,
        error: `Subject code "${code}" already exists in this college. Please use a different code.`
      }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Invalidate cache
  const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');
  await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'subjects', 'list') + '*');

  return NextResponse.json({ success: true, subject: data }, { status: 201 });
});
