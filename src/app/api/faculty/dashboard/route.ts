import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get faculty data with department info
    const { data: faculty, error: facultyError } = await supabase
      .from('users')
      .select(`
        id, first_name, last_name, email, role, faculty_type, college_id, department_id, college_uid, avatar_url, is_active,
        department:departments!users_department_id_fkey(id, name, code)
      `)
      .eq('id', userId)
      .eq('role', 'faculty')
      .single();

    if (facultyError) {
      console.error('Faculty fetch error:', facultyError);
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 });
    }

    // Parallelize all independent queries
    const [
      { data: schedule, error: scheduleError },
      { data: qualifiedSubjects, error: subjectsError },
      { data: recentActivities, error: activitiesError }
    ] = await Promise.all([
      // Get faculty's schedule/classes
      supabase
        .from('scheduled_classes')
        .select(`
          id, faculty_id, created_at,
          subject:subjects(id, name, code, subject_type),
          classroom:classrooms(id, name, capacity),
          time_slot:time_slots(id, day, start_time, end_time, slot_number),
          batch:batches(id, name, semester, section)
        `)
        .eq('faculty_id', userId)
        .order('created_at', { ascending: false }),

      // Get faculty's subjects they can teach
      supabase
        .from('faculty_qualified_subjects')
        .select(`
          id, proficiency_level, is_primary_teacher,
          subject:subjects(id, name, code, subject_type, semester)
        `)
        .eq('faculty_id', userId),

      // Get recent activities (generated timetables)
      supabase
        .from('generated_timetables')
        .select(`
          id, title, status, fitness_score, created_at,
          batch:batches(id, name, semester),
          generation_task:timetable_generation_tasks(id, status, current_phase)
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (scheduleError) console.error('Schedule fetch error:', scheduleError);
    if (subjectsError) console.error('Subjects fetch error:', subjectsError);
    if (activitiesError) console.error('Activities fetch error:', activitiesError);

    // Get dashboard stats
    const stats = {
      activeTimetables: recentActivities?.filter((t: typeof recentActivities[number]) => t.status === 'published').length || 0,
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