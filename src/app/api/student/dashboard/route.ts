import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GetStudentDashboardStatsUseCase, SupabaseDashboardQueryService } from '@/modules/dashboard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const queryService = new SupabaseDashboardQueryService(supabase);
const getStudentDataUseCase = new GetStudentDashboardStatsUseCase(queryService);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    // Fetch user first to get course details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
          id, first_name, last_name, email, role, faculty_type, 
          current_semester, college_uid, course_id, college_id,
          course:courses!course_id (id, title, code, nature_of_course),
          college:colleges!college_id (id, name)
        `)
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    let additionalData = {};

    // Only fetch dashboard aggregation if relevant fields exist
    if (userData.course_id) {
      additionalData = await getStudentDataUseCase.execute(
        userId,
        userData.course_id,
        userData.current_semester || 1,
        userData.college_id
      );
    }

    // Format events if present
    const events = (additionalData as any).events || [];

    return NextResponse.json({
      success: true,
      user: userData,
      additionalData,
      events
    });

  } catch (error: any) {
    console.error('Error in student dashboard API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
