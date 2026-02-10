import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';

// Helper function to get user from Authorization header
async function getAuthenticatedUser(request: NextRequest, requireAdmin = false) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);
    const supabase = createClient();

    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, college_id, role, faculty_type, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) return null;

    if (requireAdmin && !['admin', 'college_admin', 'super_admin'].includes(dbUser.role)) return null;

    if (!requireAdmin) {
      const allowedRoles = ['admin', 'college_admin', 'super_admin'];
      const allowedFacultyTypes = ['creator', 'publisher'];
      if (!allowedRoles.includes(dbUser.role) &&
        !(dbUser.role === 'faculty' && allowedFacultyTypes.includes(dbUser.faculty_type))) return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

export const GET = asyncHandler(
  async (request: NextRequest): Promise<NextResponse<any>> => {
    const user = await getAuthenticatedUser(request, false);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in as an admin.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryCollegeId = searchParams.get('college_id');
    let targetCollegeId = user.college_id;

    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    const { withCacheAside } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');

    const cacheKey = redisCache.buildKey(targetCollegeId, 'departments', 'list');

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
    const user = await getAuthenticatedUser(request, true);
    if (!user) {
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
    const cacheKey = redisCache.buildKey(user.college_id, 'departments', 'list');
    await invalidateCache(cacheKey);

    return NextResponse.json({ success: true, department: newDept }, { status: 201 });
  }
);