import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import {
  GetCoursesUseCase,
  CreateCourseUseCase,
  SupabaseCourseRepository,
  CreateCourseDtoSchema
} from '@/modules/course';
import { authenticate } from '@/shared/middleware/auth';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { getPaginationParams, createPaginatedResponse } from '@/shared/utils/pagination';

const supabaseClient = createClient();
const courseRepo = new SupabaseCourseRepository(supabaseClient);
const getCoursesUseCase = new GetCoursesUseCase(courseRepo);
const createCourseUseCase = new CreateCourseUseCase(courseRepo);

export const GET = asyncHandler(async (request: NextRequest) => {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
    const user = await authenticate(request);
    if (!user || !['admin', 'college_admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dto = CreateCourseDtoSchema.parse(body);

    const result = await createCourseUseCase.execute(dto);

    // Invalidate cache
    const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
    const { redisCache } = await import('@/shared/cache/redis-cache');
    const pattern = redisCache.buildKey(user.college_id!, 'courses', 'list') + '*';
    await invalidateCachePattern(pattern);

    return NextResponse.json({ success: true, course: result });
  } catch (error: any) {
    console.error('Error creating course:', error);
    const status = error.name === 'ZodError' ? 400 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
});
