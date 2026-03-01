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

// Get authenticated user helper
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);

    // Verify user exists
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, department_id, college_id, role, faculty_type, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    return dbUser;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    console.log('📊 Fetching dashboard stats for user:', user.id);

    const result = await getStatsUseCase.execute(
      user.id,
      user.department_id,
      user.faculty_type,
      { includeStats: true, includeRecent: false }
    );

    return NextResponse.json({
      success: true,
      stats: result.stats
    });

  } catch (error: any) {
    console.error('Unexpected error fetching stats:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
