import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const timetableId = searchParams.get('timetableId');

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID is required' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(`
      SELECT
        sc.id,
        sc.subject_id,
        sc.faculty_id,
        sc.classroom_id,
        sc.time_slot_id,
        sc.class_type,
        sc.credit_hour_number,
        sc.session_duration,
        json_build_object(
          'id', s.id, 'name', s.name, 'code', s.code,
          'subject_type', s.subject_type, 'credits_per_week', s.credits_per_week
        ) AS subjects,
        CASE WHEN u.id IS NOT NULL
          THEN json_build_object('id', u.id, 'first_name', u.first_name, 'last_name', u.last_name)
          ELSE NULL END AS faculty,
        CASE WHEN cr.id IS NOT NULL
          THEN json_build_object('id', cr.id, 'name', cr.name, 'building', cr.building, 'floor_number', cr.floor_number, 'capacity', cr.capacity)
          ELSE NULL END AS classrooms,
        CASE WHEN ts.id IS NOT NULL
          THEN json_build_object('id', ts.id, 'day', ts.day, 'start_time', ts.start_time, 'end_time', ts.end_time, 'is_break_time', ts.is_break_time, 'is_lunch_time', ts.is_lunch_time)
          ELSE NULL END AS time_slots
      FROM scheduled_classes sc
      LEFT JOIN subjects s ON s.id = sc.subject_id
      LEFT JOIN users u ON u.id = sc.faculty_id
      LEFT JOIN classrooms cr ON cr.id = sc.classroom_id
      LEFT JOIN time_slots ts ON ts.id = sc.time_slot_id
      WHERE sc.timetable_id = $1
    `, [timetableId]);

    const formattedClasses = result.rows.map((cls: any) => ({
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

    const usedTimeSlots = new Set<string>();
    result.rows.forEach((cls: any) => {
      if (cls.time_slots?.start_time && cls.time_slots?.end_time) {
        const timeSlot = `${String(cls.time_slots.start_time).substring(0, 5)}-${String(cls.time_slots.end_time).substring(0, 5)}`;
        usedTimeSlots.add(timeSlot);
      }
    });
    const uniqueTimeSlots = Array.from(usedTimeSlots).sort();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return NextResponse.json({ success: true, classes: formattedClasses, timeSlots: uniqueTimeSlots, days });

  } catch (error: any) {
    console.error('Error in timetable-classes API:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

