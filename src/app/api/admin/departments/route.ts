import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';

export const GET = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    let targetCollegeId = user.college_id;

    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    const { withCacheAside } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');

    const cacheKey = redisCache.buildKey(targetCollegeId as string, 'departments', 'list');

    const departments = await withCacheAside(
      { key: cacheKey, ttl: 3600 },
      async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .eq('college_id', targetCollegeId)
          .order('name');

        if (error) {
          console.error('Departments fetch error:', error);
          throw new Error('Failed to fetch departments');
        }
        return data || [];
      }
    );

    return NextResponse.json({ success: true, departments });
  }
);

export const POST = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Only admins can create departments.' },
        { status: 403 }
      );
    }

    const { name, code, description } = await request.json();
    if (!name || !code) {
      return NextResponse.json({ success: false, error: 'Name and code required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: newDept, error } = await supabase
      .from('departments')
      .insert({
        name,
        code: code.toUpperCase(),
        description: description || null,
        college_id: user.college_id
      })
      .select('id, name, code, description, college_id')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    const { invalidateCache } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');
    const cacheKey = redisCache.buildKey(user.college_id as string, 'departments', 'list');
    await invalidateCache(cacheKey);

    return NextResponse.json({ success: true, department: newDept }, { status: 201 });
  }
);