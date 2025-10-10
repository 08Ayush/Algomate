import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate AI Timetable
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { semester, department_id, batch_id, academic_year } = body;

    console.log('🤖 AI Timetable Generation Request:', { semester, department_id, batch_id });

    // 1. Fetch subjects for the semester
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('department_id', department_id)
      .eq('semester', semester)
      .eq('is_active', true);

    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch subjects',
        details: subjectsError.message 
      }, { status: 500 });
    }

    console.log(`📚 Found ${subjects?.length || 0} subjects for semester ${semester}`);

    // 2. Fetch qualified faculty for these subjects
    const subjectIds = subjects?.map(s => s.id) || [];
    const { data: facultyQualifications, error: qualError } = await supabase
      .from('faculty_qualified_subjects')
      .select(`
        id,
        faculty_id,
        subject_id,
        proficiency_level,
        faculty:users!faculty_qualified_subjects_faculty_id_fkey(
          id,
          first_name,
          last_name,
          email,
          max_hours_per_day,
          max_hours_per_week
        )
      `)
      .in('subject_id', subjectIds);

    if (qualError) {
      console.error('Error fetching faculty qualifications:', qualError);
    }

    console.log(`👨‍🏫 Found ${facultyQualifications?.length || 0} faculty qualifications`);

    // 3. Fetch available classrooms
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('department_id', department_id)
      .eq('is_available', true);

    if (classroomsError) {
      console.error('Error fetching classrooms:', classroomsError);
    }

    console.log(`🏫 Found ${classrooms?.length || 0} available classrooms`);

    // 4. Fetch batch information
    let batchInfo = null;
    if (batch_id) {
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batch_id)
        .single();

      if (!batchError) {
        batchInfo = batch;
      }
    }

    // 5. Generate timetable using AI algorithm
    const generatedTimetable = generateOptimalTimetable({
      subjects: subjects || [],
      facultyQualifications: facultyQualifications || [],
      classrooms: classrooms || [],
      semester,
      batchInfo
    });

    console.log(`✅ Generated timetable with ${generatedTimetable.schedule.length} assignments`);

    return NextResponse.json({
      success: true,
      data: {
        semester,
        academic_year: academic_year || '2025-26',
        subjects: subjects || [],
        faculty: extractUniqueFaculty(facultyQualifications || []),
        classrooms: classrooms || [],
        schedule: generatedTimetable.schedule,
        statistics: generatedTimetable.statistics,
        conflicts: generatedTimetable.conflicts
      }
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// AI Algorithm to generate optimal timetable
function generateOptimalTimetable(data: any) {
  const { subjects, facultyQualifications, classrooms, semester, batchInfo } = data;
  
  const schedule: any[] = [];
  const conflicts: any[] = [];
  const facultyWorkload = new Map<string, number>();
  const classroomBookings = new Map<string, Set<string>>();

  // Time slots configuration
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    { time: '9:00-10:00', slot: 1 },
    { time: '10:00-11:00', slot: 2 },
    { time: '11:00-11:20', slot: 3, isBreak: true },
    { time: '11:20-12:20', slot: 4 },
    { time: '12:20-1:20', slot: 5 },
    { time: '1:20-2:20', slot: 6, isLunch: true },
    { time: '2:20-3:20', slot: 7 },
    { time: '3:20-4:20', slot: 8 }
  ];

  const regularSlots = timeSlots.filter(ts => !ts.isBreak && !ts.isLunch);

  // Sort subjects by credits (higher credits first) and lab requirements
  const sortedSubjects = [...subjects].sort((a, b) => {
    if (a.subject_type === 'LAB' && b.subject_type !== 'LAB') return 1;
    if (a.subject_type !== 'LAB' && b.subject_type === 'LAB') return -1;
    return b.credits_per_week - a.credits_per_week;
  });

  let scheduleIndex = 0;

  // Generate schedule for each subject
  for (const subject of sortedSubjects) {
    const creditsNeeded = subject.credits_per_week || 4;
    const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
    const slotsNeeded = isLab ? Math.ceil(creditsNeeded / 2) : creditsNeeded; // Labs take 2 slots

    // Find qualified faculty for this subject
    const qualifiedFaculty = facultyQualifications.filter(
      (fq: any) => fq.subject_id === subject.id
    );

    if (qualifiedFaculty.length === 0) {
      conflicts.push({
        type: 'no_faculty',
        subject: subject.name,
        message: `No qualified faculty found for ${subject.name}`
      });
      continue;
    }

    // Select best faculty (least loaded)
    const bestFaculty = qualifiedFaculty.sort((a: any, b: any) => {
      const loadA = facultyWorkload.get(a.faculty_id) || 0;
      const loadB = facultyWorkload.get(b.faculty_id) || 0;
      return loadA - loadB;
    })[0];

    const faculty = Array.isArray(bestFaculty.faculty) 
      ? bestFaculty.faculty[0] 
      : bestFaculty.faculty;

    // Select appropriate classroom
    const appropriateClassroom = classrooms.find((room: any) => {
      if (isLab && !room.has_lab_equipment) return false;
      if (subject.requires_projector && !room.has_projector) return false;
      return room.capacity >= (batchInfo?.expected_strength || 60);
    }) || classrooms[0];

    // Assign time slots
    let slotsAssigned = 0;
    for (let dayIdx = 0; dayIdx < days.length && slotsAssigned < slotsNeeded; dayIdx++) {
      const day = days[dayIdx];
      
      for (let slotIdx = 0; slotIdx < regularSlots.length && slotsAssigned < slotsNeeded; slotIdx++) {
        const timeSlot = regularSlots[slotIdx];
        const slotKey = `${day}-${timeSlot.time}`;

        // Check for conflicts
        const facultyBusy = schedule.some(
          s => s.day === day && s.time === timeSlot.time && s.faculty_id === faculty.id
        );
        const classroomBusy = schedule.some(
          s => s.day === day && s.time === timeSlot.time && s.classroom_id === appropriateClassroom?.id
        );

        if (!facultyBusy && !classroomBusy) {
          // For labs, try to allocate consecutive slots
          if (isLab && slotsAssigned === 0) {
            const nextSlot = regularSlots[slotIdx + 1];
            if (nextSlot) {
              const nextSlotKey = `${day}-${nextSlot.time}`;
              const nextFacultyBusy = schedule.some(
                s => s.day === day && s.time === nextSlot.time && s.faculty_id === faculty.id
              );
              const nextClassroomBusy = schedule.some(
                s => s.day === day && s.time === nextSlot.time && s.classroom_id === appropriateClassroom?.id
              );

              if (!nextFacultyBusy && !nextClassroomBusy) {
                // Assign 2-hour lab session
                schedule.push({
                  id: `schedule-${scheduleIndex++}`,
                  subject_id: subject.id,
                  subject_name: subject.name,
                  subject_code: subject.code,
                  subject_type: subject.subject_type,
                  faculty_id: faculty.id,
                  faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                  classroom_id: appropriateClassroom?.id,
                  classroom_name: appropriateClassroom?.name,
                  day: day,
                  time: timeSlot.time,
                  duration: 2,
                  semester: semester,
                  is_lab: true
                });

                // Mark next slot as part of lab
                schedule.push({
                  id: `schedule-${scheduleIndex++}`,
                  subject_id: subject.id,
                  subject_name: `${subject.name} (Lab cont.)`,
                  subject_code: subject.code,
                  subject_type: subject.subject_type,
                  faculty_id: faculty.id,
                  faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                  classroom_id: appropriateClassroom?.id,
                  classroom_name: appropriateClassroom?.name,
                  day: day,
                  time: nextSlot.time,
                  duration: 1,
                  semester: semester,
                  is_lab: true,
                  is_continuation: true
                });

                facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 2);
                slotsAssigned += 1; // Lab counts as one session even though it takes 2 slots
                slotIdx++; // Skip next slot since we used it
                continue;
              }
            }
          }

          // Regular single slot assignment
          schedule.push({
            id: `schedule-${scheduleIndex++}`,
            subject_id: subject.id,
            subject_name: subject.name,
            subject_code: subject.code,
            subject_type: subject.subject_type,
            faculty_id: faculty.id,
            faculty_name: `${faculty.first_name} ${faculty.last_name}`,
            classroom_id: appropriateClassroom?.id,
            classroom_name: appropriateClassroom?.name,
            day: day,
            time: timeSlot.time,
            duration: 1,
            semester: semester,
            is_lab: isLab
          });

          facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 1);
          slotsAssigned++;
        }
      }
    }

    if (slotsAssigned < slotsNeeded) {
      conflicts.push({
        type: 'insufficient_slots',
        subject: subject.name,
        message: `Could only assign ${slotsAssigned} out of ${slotsNeeded} required slots for ${subject.name}`
      });
    }
  }

  // Calculate statistics
  const statistics = {
    totalSubjects: subjects.length,
    totalAssignments: schedule.length,
    theoryAssignments: schedule.filter((s: any) => !s.is_lab).length,
    labAssignments: schedule.filter((s: any) => s.is_lab).length,
    facultyUtilization: Array.from(facultyWorkload.entries()).map(([id, hours]) => ({
      faculty_id: id,
      hours_assigned: hours
    })),
    conflictsDetected: conflicts.length,
    completionRate: ((schedule.length / (subjects.length * 4)) * 100).toFixed(1)
  };

  return {
    schedule,
    statistics,
    conflicts
  };
}

// Helper function to extract unique faculty
function extractUniqueFaculty(qualifications: any[]) {
  const facultyMap = new Map();
  
  qualifications.forEach((qual: any) => {
    const faculty = Array.isArray(qual.faculty) ? qual.faculty[0] : qual.faculty;
    if (faculty && !facultyMap.has(faculty.id)) {
      facultyMap.set(faculty.id, {
        id: faculty.id,
        name: `${faculty.first_name} ${faculty.last_name}`,
        email: faculty.email
      });
    }
  });

  return Array.from(facultyMap.values());
}
