import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { GetFacultyDashboardStatsUseCase, SupabaseDashboardQueryService } from '@/modules/dashboard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const queryService = new SupabaseDashboardQueryService(supabase);
const getStatsUseCase = new GetFacultyDashboardStatsUseCase(queryService);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    console.log('📋 Fetching recent data for user:', user.id);

    const result = await getStatsUseCase.execute(
      user.id,
      user.department_id,
      user.faculty_type,
      { includeStats: false, includeRecent: true }
    );

    return NextResponse.json({
      success: true,
      recentTimetables: result.recentTimetables,
      recentActivities: result.recentActivities,
      pendingReviewCount: result.pendingReviewCount
    });

  } catch (error: any) {
    console.error('Unexpected error fetching recent data:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
