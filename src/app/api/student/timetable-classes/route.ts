import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/shared/database';
import { GetStudentTimetableUseCase } from '@/modules/timetable/application/use-cases/GetStudentTimetableUseCase';
import { handleError } from '@/shared/utils/response';
import { requireAuth } from '@/lib/auth';


export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const timetableId = searchParams.get('timetableId');

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID is required' }, { status: 400 });
    }

    const getStudentTimetableUseCase = new GetStudentTimetableUseCase(supabase);
    const classes = await getStudentTimetableUseCase.execute(timetableId);

    // Transform data (Reuse legacy transformation logic for frontend compatibility)
    const formattedClasses = classes.map((cls: any) => ({
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
    }));

    // Calculate time slots
    const usedTimeSlots = new Set<string>();
    classes.forEach((cls: any) => {
      if (cls.time_slots?.start_time && cls.time_slots?.end_time) {
        const timeSlot = `${cls.time_slots.start_time.substring(0, 5)}-${cls.time_slots.end_time.substring(0, 5)}`;
        usedTimeSlots.add(timeSlot);
      }
    });
    const uniqueTimeSlots = Array.from(usedTimeSlots).sort();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return NextResponse.json({
      success: true,
      classes: formattedClasses,
      timeSlots: uniqueTimeSlots,
      days
    });

  } catch (error) {
    return handleError(error);
  }
}
