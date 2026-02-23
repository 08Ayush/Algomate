import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get faculty data with department info
    const { data: faculty, error: facultyError } = await supabase
      .from('users')
      .select(`
        *,
        department:departments!users_department_id_fkey(*)
      `)
      .eq('id', userId)
      .eq('role', 'faculty')
      .single();

    if (facultyError) {
      console.error('Faculty fetch error:', facultyError);
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Get faculty's schedule/classes
    const { data: schedule, error: scheduleError } = await supabase
      .from('scheduled_classes')
      .select(`
        *,
        subject:subjects(*),
        classroom:classrooms(*),
        time_slot:time_slots(*),
        batch:batches(*)
      `)
      .eq('faculty_id', userId)
      .order('created_at', { ascending: false });

    if (scheduleError) {
      console.error('Schedule fetch error:', scheduleError);
    }

    // Get faculty's subjects they can teach
    const { data: qualifiedSubjects, error: subjectsError } = await supabase
      .from('faculty_qualified_subjects')
      .select(`
        *,
        subject:subjects(*)
      `)
      .eq('faculty_id', userId);

    if (subjectsError) {
      console.error('Subjects fetch error:', subjectsError);
    }

    // Get recent activities (generated timetables)
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('generated_timetables')
      .select(`
        *,
        batch:batches(*),
        generation_task:timetable_generation_tasks(*)
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (activitiesError) {
      console.error('Activities fetch error:', activitiesError);
    }

    // Get dashboard stats
    const stats = {
      activeTimetables: recentActivities?.filter(t => t.status === 'published').length || 0,
      totalTimetables: recentActivities?.length || 0,
      qualifiedSubjects: qualifiedSubjects?.length || 0,
      scheduledClasses: schedule?.length || 0
    };

    return NextResponse.json({
      faculty,
      department: faculty.department,
      facultyRole: faculty.faculty_type || 'general',
      schedule: schedule || [],
      qualifiedSubjects: qualifiedSubjects || [],
      recentActivities: recentActivities || [],
      stats
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}