import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const timetableId = params.id;

    if (!timetableId) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    // Get timetable details
    const { data: timetable, error: timetableError } = await supabase
      .from('generated_timetables')
      .select(`
        *,
        created_by_user:users!created_by(first_name, last_name, email),
        published_by_user:users!published_by(first_name, last_name, email),
        rejected_by_user:users!rejected_by(first_name, last_name, email),
        department:departments(name, code),
        college:colleges(name, code)
      `)
      .eq('id', timetableId)
      .single();

    if (timetableError || !timetable) {
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Get scheduled classes
    const { data: scheduledClasses, error: classesError } = await supabase
      .from('scheduled_classes')
      .select(`
        *,
        subject:subjects(id, name, code, subject_type, credits_per_week, requires_lab),
        faculty:users!faculty_id(id, first_name, last_name, email),
        classroom:classrooms(id, name, capacity, building, floor)
      `)
      .eq('timetable_id', timetableId)
      .order('day_of_week')
      .order('start_time');

    if (classesError) {
      console.error('Error fetching scheduled classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled classes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timetable,
      scheduledClasses: scheduledClasses || []
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}