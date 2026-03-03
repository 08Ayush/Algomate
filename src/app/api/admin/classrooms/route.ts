import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import {
  GetClassroomsUseCase,
  CreateClassroomUseCase,
  SupabaseClassroomRepository,
  CreateClassroomDtoSchema
} from '@/modules/classroom';
import { requireAuth } from '@/lib/auth';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { getPaginationParams, createPaginatedResponse } from '@/shared/utils/pagination';
import { getPool } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const classroomRepo = new SupabaseClassroomRepository(supabase as any);
const getClassroomsUseCase = new GetClassroomsUseCase(classroomRepo);
const createClassroomUseCase = new CreateClassroomUseCase(classroomRepo);

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user; // Auth failed

  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');
  const collegeId = searchParams.get('college_id') || user.college_id;
  const { page, limit, isPaginated } = getPaginationParams(request);

  if (!collegeId) {
    return NextResponse.json({ success: false, error: 'College ID is required' }, { status: 400 });
  }

  const { withCacheAside } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');

  const cacheKeyParts = [collegeId, 'classrooms', 'list'];
  if (departmentId) cacheKeyParts.push(`dept:${departmentId}`);
  if (isPaginated) cacheKeyParts.push(`p:${page}:l:${limit}`);
  const cacheKey = redisCache.buildKey(cacheKeyParts[0], cacheKeyParts[1], cacheKeyParts[2], cacheKeyParts.slice(3).join(':') || undefined);

  const result = await withCacheAside(
    { key: cacheKey, ttl: 1800 },
    async () => {
      const pool = getPool();
      const params: any[] = [collegeId];
      let sql = `
        SELECT c.*,
          d.name AS department_name,
          d.code AS department_code
        FROM classrooms c
        LEFT JOIN departments d ON d.id = c.department_id
        WHERE c.college_id = $1
      `;

      if (departmentId) {
        sql += ` AND c.department_id = $${params.length + 1}`;
        params.push(departmentId);
      }

      const countParams = departmentId ? [collegeId, departmentId] : [collegeId];
      const countSql = `SELECT COUNT(*) FROM classrooms WHERE college_id = $1${departmentId ? ' AND department_id = $2' : ''}`;
      const countResult = await pool.query(countSql, countParams);
      const total = parseInt(countResult.rows[0].count, 10);

      if (isPaginated && page && limit) {
        const offset = (page - 1) * limit;
        sql += ` ORDER BY c.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
      } else {
        sql += ' ORDER BY c.name';
      }

      const { rows } = await pool.query(sql, params);
      return { classrooms: rows, total };
    }
  );

  if (isPaginated && page && limit) {
    const paginated = createPaginatedResponse(result.classrooms, result.total, page, limit);

    return NextResponse.json({
      success: true,
      classrooms: paginated.data,
      meta: paginated.meta
    });
  }

  return NextResponse.json({
    success: true,
    classrooms: result.classrooms,
    meta: { total: result.total }
  });
});

export const POST = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  if (!['admin', 'college_admin', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const dto = CreateClassroomDtoSchema.parse(body);

  const result = await createClassroomUseCase.execute(dto);

  // Invalidate cache
  const { invalidateCachePattern } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');
  await invalidateCachePattern(redisCache.buildKey(user.college_id!, 'classrooms', 'list') + '*');

  return NextResponse.json({ success: true, classroom: result });
});