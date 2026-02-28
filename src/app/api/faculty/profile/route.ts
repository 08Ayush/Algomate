import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { asyncHandler } from '@/shared/middleware/error-handler';
import { requireAuth } from '@/lib/auth';

export const GET = asyncHandler(async (request: NextRequest) => {
  const user = requireAuth(request);
  if (user instanceof NextResponse) return user;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
  }

  const { withCacheAside } = await import('@/shared/cache/cache-helper');
  const { redisCache } = await import('@/shared/cache/redis-cache');

  const cacheKey = redisCache.buildKey('global', 'faculty', 'profile', userId);

  const result = await withCacheAside(
    { key: cacheKey, ttl: 3600 },
    async () => {
      const supabase = createClient();
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          college_uid,
          email,
          phone,
          profile_image_url,
          department_id,
          college_id,
          role,
          faculty_type,
          max_hours_per_day,
          max_hours_per_week,
          min_hours_per_week,
          faculty_priority,
          algorithm_weight,
          preferred_days,
          avoid_days,
          preferred_time_start,
          preferred_time_end,
          unavailable_slots,
          is_shared_faculty,
          is_guest_faculty,
          is_active,
          email_verified,
          last_login,
          created_at,
          updated_at,
          departments (
            id,
            name,
            code,
            description
          )
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (userError || !user) {
        throw new Error('User not found');
      }

      if (user.role !== 'faculty') {
        throw new Error('User is not a faculty member');
      }

      return {
        user,
        department: user.departments,
        facultyRole: user.faculty_type
      };
    }
  );

  return NextResponse.json({
    success: true,
    ...result
  });
});
