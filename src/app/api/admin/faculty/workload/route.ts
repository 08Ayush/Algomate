import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const faculty_id = searchParams.get('faculty_id');

    if (!faculty_id) {
      return NextResponse.json({ error: 'Faculty ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch all scheduled classes for this faculty from published timetables
    const { data: classes, error: classesError } = await supabase
      .from('scheduled_classes')
      .select(`
        id,
        time_slot_id,
        time_slots:time_slots!scheduled_classes_time_slot_id_fkey (
          id,
          day,
          start_time,
          end_time
        ),
        timetables:generated_timetables!scheduled_classes_timetable_id_fkey (
          id,
          status
        )
      `)
      .eq('faculty_id', faculty_id);

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json({ error: 'Failed to fetch faculty workload' }, { status: 500 });
    }

    // Filter only published timetables
    const publishedClasses = (classes || []).filter((cls: any) => 
      cls.timetables?.status === 'published'
    );

    // Count lectures by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const workloadByDay: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0
    };

    publishedClasses.forEach((cls: any) => {
      const day = cls.time_slots?.day;
      if (day && workloadByDay.hasOwnProperty(day)) {
        workloadByDay[day]++;
      }
    });

    // Calculate total workload
    const totalLectures = Object.values(workloadByDay).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      faculty_id,
      workload_by_day: workloadByDay,
      total_lectures: totalLectures,
      days: days.map(day => ({
        day,
        lecture_count: workloadByDay[day]
      }))
    });

  } catch (error: any) {
    console.error('Error fetching faculty workload:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

