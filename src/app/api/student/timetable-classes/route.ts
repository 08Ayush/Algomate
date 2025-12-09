import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timetableId = searchParams.get('timetableId');

    console.log('🕐 Fetching timetable classes for timetableId:', timetableId);

    if (!timetableId) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    // Fetch scheduled classes with all related information
    const { data: classes, error: classesError } = await supabase
      .from('scheduled_classes')
      .select(`
        id,
        subject_id,
        faculty_id,
        classroom_id,
        time_slot_id,
        class_type,
        credit_hour_number,
        session_duration,
        subjects (
          id,
          name,
          code,
          subject_type,
          credits_per_week
        ),
        faculty:users!faculty_id (
          id,
          first_name,
          last_name
        ),
        classrooms (
          id,
          name,
          building,
          floor_number,
          capacity
        ),
        time_slots (
          id,
          day,
          start_time,
          end_time,
          is_break_time,
          is_lunch_time
        )
      `)
      .eq('timetable_id', timetableId);

    if (classesError) {
      console.error('❌ Error fetching scheduled classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled classes' },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${classes?.length || 0} scheduled classes`);

    // Transform data to a more usable format
    const formattedClasses = classes?.map((cls: any) => ({
      id: cls.id,
      subjectId: cls.subject_id,
      subjectName: cls.subjects?.name || 'Unknown Subject',
      subjectCode: cls.subjects?.code || '',
      subjectType: cls.class_type || cls.subjects?.subject_type || 'THEORY',
      credits: cls.subjects?.credits_per_week || 0,
      facultyId: cls.faculty_id,
      facultyName: cls.faculty 
        ? `${cls.faculty.first_name} ${cls.faculty.last_name}` 
        : 'TBA',
      classroomId: cls.classroom_id,
      classroomName: cls.classrooms?.name || 'TBA',
      building: cls.classrooms?.building || '',
      floor: cls.classrooms?.floor_number || 0,
      day: cls.time_slots?.day || '',
      startTime: cls.time_slots?.start_time || '',
      endTime: cls.time_slots?.end_time || '',
      isBreak: cls.time_slots?.is_break_time || false,
      isLunch: cls.time_slots?.is_lunch_time || false,
      isLab: cls.class_type === 'LAB' || cls.class_type === 'PRACTICAL',
      isContinuation: false,
      sessionNumber: cls.credit_hour_number || 1,
      sessionDuration: cls.session_duration || 60,
    })) || [];

    // Get unique days
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Extract unique time slots from the actual scheduled classes
    // This ensures we only show time slots that have classes scheduled
    const usedTimeSlots = new Set<string>();
    
    classes?.forEach((cls: any) => {
      if (cls.time_slots?.start_time && cls.time_slots?.end_time) {
        const timeSlot = `${cls.time_slots.start_time.substring(0, 5)}-${cls.time_slots.end_time.substring(0, 5)}`;
        usedTimeSlots.add(timeSlot);
      }
    });
    
    // Convert Set to sorted array
    const uniqueTimeSlots = Array.from(usedTimeSlots).sort();

    console.log('📊 Returning:', {
      classesCount: formattedClasses.length,
      timeSlotsCount: uniqueTimeSlots.length,
      timeSlots: uniqueTimeSlots
    });

    return NextResponse.json({
      success: true,
      classes: formattedClasses,
      timeSlots: uniqueTimeSlots,
      days,
    });
  } catch (error) {
    console.error('Error in timetable classes API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
