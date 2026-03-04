import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import {
  GetCoursesUseCase,
  SupabaseCourseRepository,
} from '@/modules/course';
import { requireAuth } from '@/lib/auth';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { getPaginationParams, createPaginatedResponse } from '@/shared/utils/pagination';
import { getPool } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const courseRepo = new SupabaseCourseRepository(supabase as any);
const getCoursesUseCase = new GetCoursesUseCase(courseRepo);

export const GET = asyncHandler(async (request: NextRequest) => {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const { page, limit, isPaginated } = getPaginationParams(request);
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get('departmentId');
    const queryCollegeId = searchParams.get('college_id');

    let targetCollegeId = user.college_id;
    if (user.role === 'super_admin' && queryCollegeId) {
      targetCollegeId = queryCollegeId;
    }

    if (!targetCollegeId) {
      return NextResponse.json({ success: false, error: 'College ID is required' }, { status: 400 });
    }

    const { withCacheAside } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');

    const cacheKeyParts = [targetCollegeId, 'courses', 'list'];
    if (departmentId) cacheKeyParts.push(`dept:${departmentId}`);
    if (isPaginated) cacheKeyParts.push(`p:${page}:l:${limit}`);

    const cacheKey = redisCache.buildKey(cacheKeyParts[0], cacheKeyParts[1], cacheKeyParts[2], cacheKeyParts.slice(3).join(':') || undefined);

    const result = await withCacheAside(
      { key: cacheKey, ttl: 1800 },
      async () => {
        return await getCoursesUseCase.execute(
          targetCollegeId!,
          departmentId || undefined,
          page,
          limit
        );
      }
    );

    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(result.courses || [], result.total || 0, page, limit);
      return NextResponse.json({
        success: true,
        courses: paginatedResult.data,
        meta: paginatedResult.meta
      });
    } else {
      return NextResponse.json({
        success: true,
        courses: result.courses || [],
        meta: { total: result.total || 0 }
      });
    }
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = asyncHandler(async (request: NextRequest) => {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, code, nature_of_course, intake, duration_years } = body;

    if (!title || !code) {
      return NextResponse.json({ success: false, error: 'Title and code are required' }, { status: 400 });
    }

    const pool = getPool();

    // Check for duplicate code in this college
    const dupCheck = await pool.query(
      `SELECT id FROM courses WHERE code = $1 AND college_id = $2`,
      [code.toUpperCase(), user.college_id]
    );
    if (dupCheck.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Course code already exists in your college' }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO courses (title, code, college_id, nature_of_course, intake, duration_years)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      title, code.toUpperCase(), user.college_id,
      nature_of_course || null,
      intake ?? 60,
      duration_years ?? null
    ]);

    // Invalidate cache
    const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');
    const pattern = redisCache.buildKey(user.college_id!, 'courses', 'list') + '*';
    await invalidateCachePattern(pattern);

    return NextResponse.json({ success: true, course: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
