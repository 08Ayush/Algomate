import { NextRequest, NextResponse } from 'next/server';
import { serviceDb } from '@/shared/database';
import { requireRoles } from '@/lib/auth';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { withCacheAside } from '@/shared/cache/cache-helper';
import { redisCache } from '@/shared/cache/redis-cache';

export const GET = asyncHandler(async (request: NextRequest) => {
    try {
        // Authenticate user and check roles
        const authResult = requireRoles(request, ['admin', 'college_admin', 'super_admin']);
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { searchParams } = new URL(request.url);
        const collegeId = searchParams.get('college_id');

        if (!collegeId) {
            return NextResponse.json({ success: false, error: 'College ID is required' }, { status: 400 });
        }

        const cacheKey = redisCache.buildKey(collegeId, 'admin', 'stats');

        const stats = await withCacheAside(
            { key: cacheKey, ttl: 900 }, // 15 minutes cache
            async () => {
                // Parallel counting for efficiency
                const [
                    { count: departmentsCount },
                    { count: facultyCount },
                    { count: classroomsCount },
                    { count: batchesCount },
                    { count: subjectsCount },
                    { count: coursesCount },
                    { count: studentsCount },
                    { count: constraintsCount }
                ] = await Promise.all([
                    serviceDb.from('departments').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
                    serviceDb.from('users').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('role', 'faculty'),
                    serviceDb.from('classrooms').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
                    serviceDb.from('batches').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
                    serviceDb.from('subjects').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
                    serviceDb.from('courses').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
                    serviceDb.from('users').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('role', 'student'),
                    serviceDb.from('constraint_rules').select('*', { count: 'exact', head: true })
                ]);

                return {
                    departments: departmentsCount || 0,
                    faculty: facultyCount || 0,
                    classrooms: classroomsCount || 0,
                    batches: batchesCount || 0,
                    subjects: subjectsCount || 0,
                    courses: coursesCount || 0,
                    students: studentsCount || 0,
                    constraints: constraintsCount || 0
                };
            }
        );

        return NextResponse.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Stats API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
});
