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

    // Get timetable details - simplified query to avoid RLS issues
    const { data: timetable, error: timetableError } = await supabase
      .from('generated_timetables')
      .select('*')
      .eq('id', timetableId)
      .single();

    if (timetableError || !timetable) {
      console.error('Error fetching timetable:', timetableError);
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Fetch batch name separately
    let batchName = 'Unknown Batch';
    if (timetable.batch_id) {
      const { data: batchData } = await supabase
        .from('batches')
        .select('name')
        .eq('id', timetable.batch_id)
        .maybeSingle();
      if (batchData) batchName = batchData.name;
    }

    // Fetch creator name separately
    let creatorName = 'Unknown';
    if (timetable.created_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', timetable.created_by)
        .maybeSingle();
      if (userData) creatorName = `${userData.first_name} ${userData.last_name}`;
    }

    // Get scheduled classes
    const { data: scheduledClasses, error: classesError } = await supabase
      .from('scheduled_classes')
      .select('id, timetable_id, subject_id, faculty_id, classroom_id, time_slot_id, notes, session_duration, class_type, is_continuation, is_lab, session_number')
      .eq('timetable_id', timetableId);

    if (classesError) {
      console.error('Error fetching scheduled classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled classes' },
        { status: 500 }
      );
    }

    // Enrich classes with related data
    const enrichedClasses = await Promise.all(
      (scheduledClasses || []).map(async (cls) => {
        // Get time slot
        const { data: timeSlot } = await supabase
          .from('time_slots')
          .select('day, start_time, end_time')
          .eq('id', cls.time_slot_id)
          .maybeSingle();

        // Get subject
        const { data: subject } = await supabase
          .from('subjects')
          .select('name, code')
          .eq('id', cls.subject_id)
          .maybeSingle();

        // Get faculty
        const { data: faculty } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', cls.faculty_id)
          .maybeSingle();

        // Get classroom
        const { data: classroom } = await supabase
          .from('classrooms')
          .select('name')
          .eq('id', cls.classroom_id)
          .maybeSingle();

        return {
          ...cls,
          day: timeSlot?.day || '',
          start_time: timeSlot?.start_time || '',
          end_time: timeSlot?.end_time || '',
          subject_name: subject?.name || 'Unknown',
          subject_code: subject?.code || '',
          faculty_name: faculty ? `${faculty.first_name} ${faculty.last_name}` : 'Unknown',
          classroom_name: classroom?.name || 'Unknown'
        };
      })
    );

    return NextResponse.json({
      success: true,
      timetable: {
        ...timetable,
        batch_name: batchName,
        creator_name: creatorName
      },
      scheduledClasses: enrichedClasses
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}