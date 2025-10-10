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

    // 3. Fetch available classrooms (separate labs and regular classrooms)
    const { data: allClassrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('department_id', department_id)
      .eq('is_available', true);

    if (classroomsError) {
      console.error('Error fetching classrooms:', classroomsError);
    }

    // Separate labs and regular classrooms
    const labs = allClassrooms?.filter(room => room.has_lab_equipment === true) || [];
    const classrooms = allClassrooms?.filter(room => room.has_lab_equipment !== true) || [];

    console.log(`🏫 Found ${classrooms.length} regular classrooms and ${labs.length} labs`);
    
    // Ensure we have at least one classroom and one lab
    if (classrooms.length === 0 && labs.length === 0) {
      console.error('❌ No classrooms or labs available!');
      return NextResponse.json({
        success: false,
        error: 'No classrooms or labs available',
        details: 'Please add classrooms to the department'
      }, { status: 400 });
    }
    
    // If no labs, use classrooms for everything
    if (labs.length === 0) {
      console.warn('⚠️ No labs found, using classrooms for all subjects');
    }
    
    // If no classrooms, use labs for everything
    if (classrooms.length === 0) {
      console.warn('⚠️ No classrooms found, using labs for all subjects');
    }

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
      labs: labs || [],
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
        labs: labs || [],
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
  const { subjects, facultyQualifications, classrooms, labs, semester, batchInfo } = data;
  
  const schedule: any[] = [];
  const conflicts: any[] = [];
  const facultyWorkload = new Map<string, number>();
  const subjectHoursAssigned = new Map<string, number>();

  // Time slots configuration - matching database structure
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    { time: '09:00', displayTime: '9:00-10:00', slot: 1 },
    { time: '10:00', displayTime: '10:00-11:00', slot: 2 },
    { time: '11:15', displayTime: '11:15-12:15', slot: 3 }, // After break
    { time: '12:15', displayTime: '12:15-1:15', slot: 4 },
    { time: '14:15', displayTime: '2:15-3:15', slot: 5 }, // After lunch
    { time: '15:15', displayTime: '3:15-4:15', slot: 6 }
  ];

  // Total slots available: 6 days × 6 slots = 36 slots
  const TOTAL_SLOTS = days.length * timeSlots.length;
  const TARGET_CLASSES = TOTAL_SLOTS; // Fill all 36 slots

  // Sort subjects: Theory first, then labs. Higher credits first
  const sortedSubjects = [...subjects].sort((a, b) => {
    if (a.subject_type === 'LAB' && b.subject_type !== 'LAB') return 1;
    if (a.subject_type !== 'LAB' && b.subject_type === 'LAB') return -1;
    return (b.credits_per_week || 4) - (a.credits_per_week || 4);
  });

  let scheduleIndex = 0;

  // Log available resources
  console.log('📊 Available Resources:');
  console.log(`   - Subjects: ${subjects.length}`);
  console.log(`   - Faculty qualifications: ${facultyQualifications.length}`);
  console.log(`   - Classrooms: ${classrooms.length}`);
  console.log(`   - Labs: ${labs.length}`);
  console.log(`   - Days: ${days.length}`);
  console.log(`   - Time slots per day: ${timeSlots.length}`);
  console.log(`   - Total slots available: ${TOTAL_SLOTS}`);

  // PHASE 1: Assign minimum required hours for each subject
  console.log('📅 Phase 1: Assigning minimum required hours for each subject...');
  
  for (const subject of sortedSubjects) {
    const creditsNeeded = subject.credits_per_week || 4;
    const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
    const minSessionsNeeded = isLab ? Math.ceil(creditsNeeded / 2) : creditsNeeded;

    // Find qualified faculty
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

    // Select best faculty (highest proficiency, least loaded)
    const bestFaculty = qualifiedFaculty.sort((a: any, b: any) => {
      const loadA = facultyWorkload.get(a.faculty_id) || 0;
      const loadB = facultyWorkload.get(b.faculty_id) || 0;
      if (loadA !== loadB) return loadA - loadB;
      return (b.proficiency_level || 7) - (a.proficiency_level || 7);
    })[0];

    const faculty = Array.isArray(bestFaculty.faculty) 
      ? bestFaculty.faculty[0] 
      : bestFaculty.faculty;

    if (!faculty) {
      conflicts.push({
        type: 'faculty_data_error',
        subject: subject.name,
        message: `Faculty data missing for ${subject.name}`
      });
      continue;
    }

    // Select appropriate room based on subject type (isLab already defined above)
    // Try to get appropriate rooms, but fall back to any available room if needed
    let availableRooms = isLab ? labs : classrooms;
    
    // Fallback: if no appropriate rooms, use the other type
    if (availableRooms.length === 0) {
      console.warn(`⚠️ No ${isLab ? 'labs' : 'classrooms'} for ${subject.name}, using ${isLab ? 'classrooms' : 'labs'}`);
      availableRooms = isLab ? classrooms : labs;
    }
    
    if (availableRooms.length === 0) {
      conflicts.push({
        type: 'no_room',
        subject: subject.name,
        message: `No rooms available for ${subject.name}`
      });
      continue;
    }

    const classroom = availableRooms.find((room: any) => {
      if (subject.requires_projector && !room.has_projector) return false;
      return room.capacity >= (batchInfo?.expected_strength || 60);
    }) || availableRooms[0];

    let sessionsAssigned = 0;
    
    // Assign minimum required sessions
    for (let dayIdx = 0; dayIdx < days.length && sessionsAssigned < minSessionsNeeded; dayIdx++) {
      const day = days[dayIdx];
      
      for (let slotIdx = 0; slotIdx < timeSlots.length && sessionsAssigned < minSessionsNeeded; slotIdx++) {
        const timeSlot = timeSlots[slotIdx];

        // Check if slot is already used (batch conflict)
        const slotTaken = schedule.some(
          s => s.day === day && s.time === timeSlot.time
        );
        const facultyBusy = schedule.some(
          s => s.day === day && s.time === timeSlot.time && s.faculty_id === faculty.id
        );
        const classroomBusy = classroom && schedule.some(
          s => s.day === day && s.time === timeSlot.time && s.classroom_id === classroom.id
        );

        if (!slotTaken && !facultyBusy && !classroomBusy) {
          // For labs, try consecutive slots
          if (isLab && slotIdx < timeSlots.length - 1) {
            const nextSlot = timeSlots[slotIdx + 1];
            const nextSlotTaken = schedule.some(
              s => s.day === day && s.time === nextSlot.time
            );
            const nextFacultyBusy = schedule.some(
              s => s.day === day && s.time === nextSlot.time && s.faculty_id === faculty.id
            );
            const nextClassroomBusy = classroom && schedule.some(
              s => s.day === day && s.time === nextSlot.time && s.classroom_id === classroom.id
            );

            if (!nextSlotTaken && !nextFacultyBusy && !nextClassroomBusy) {
              // 2-hour lab session
              schedule.push({
                id: `schedule-${scheduleIndex++}`,
                subject_id: subject.id,
                subject_name: subject.name,
                subject_code: subject.code,
                subject_type: subject.subject_type,
                faculty_id: faculty.id,
                faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                classroom_id: classroom?.id || null,
                classroom_name: classroom?.name || 'TBA',
                day: day,
                time: timeSlot.time,
                displayTime: timeSlot.displayTime,
                duration: 2,
                semester: semester,
                is_lab: true,
                session_number: sessionsAssigned + 1
              });

              schedule.push({
                id: `schedule-${scheduleIndex++}`,
                subject_id: subject.id,
                subject_name: `${subject.name} (Lab cont.)`,
                subject_code: subject.code,
                subject_type: subject.subject_type,
                faculty_id: faculty.id,
                faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                classroom_id: classroom?.id || null,
                classroom_name: classroom?.name || 'TBA',
                day: day,
                time: nextSlot.time,
                displayTime: nextSlot.displayTime,
                duration: 1,
                semester: semester,
                is_lab: true,
                is_continuation: true,
                session_number: sessionsAssigned + 1
              });

              facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 2);
              subjectHoursAssigned.set(subject.id, (subjectHoursAssigned.get(subject.id) || 0) + 2);
              sessionsAssigned += 1;
              slotIdx++;
              continue;
            }
          }

          // Regular theory class
          schedule.push({
            id: `schedule-${scheduleIndex++}`,
            subject_id: subject.id,
            subject_name: subject.name,
            subject_code: subject.code,
            subject_type: subject.subject_type,
            faculty_id: faculty.id,
            faculty_name: `${faculty.first_name} ${faculty.last_name}`,
            classroom_id: classroom?.id || null,
            classroom_name: classroom?.name || 'TBA',
            day: day,
            time: timeSlot.time,
            displayTime: timeSlot.displayTime,
            duration: 1,
            semester: semester,
            is_lab: false,
            session_number: sessionsAssigned + 1
          });

          facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 1);
          subjectHoursAssigned.set(subject.id, (subjectHoursAssigned.get(subject.id) || 0) + 1);
          sessionsAssigned++;
        }
      }
    }

    if (sessionsAssigned < minSessionsNeeded) {
      conflicts.push({
        type: 'insufficient_slots',
        subject: subject.name,
        required: minSessionsNeeded,
        assigned: sessionsAssigned,
        message: `Could only assign ${sessionsAssigned} out of ${minSessionsNeeded} required sessions for ${subject.name}`
      });
    }
  }

  console.log(`✅ Phase 1 complete: ${schedule.length} classes assigned`);
  console.log('📊 Phase 1 Summary:');
  console.log(`   - Subjects processed: ${sortedSubjects.length}`);
  console.log(`   - Classes scheduled: ${schedule.length}`);
  console.log(`   - Conflicts: ${conflicts.length}`);
  if (conflicts.length > 0) {
    console.log('⚠️ Conflicts encountered:');
    conflicts.forEach(c => console.log(`   - ${c.type}: ${c.message}`));
  }

  // Track which subjects have met their minimum requirements
  const fullyAssignedSubjects = new Set<string>();
  sortedSubjects.forEach(subject => {
    const minSessionsNeeded = subject.credits_per_week || 3;
    const assigned = subjectHoursAssigned.get(subject.id) || 0;
    if (assigned >= minSessionsNeeded) {
      fullyAssignedSubjects.add(subject.id);
      console.log(`✓ ${subject.name}: ${assigned} hours assigned (minimum ${minSessionsNeeded})`);
    }
  });

  // PHASE 2: Fill remaining empty slots with additional subject hours
  console.log('📅 Phase 2: Filling remaining slots to reach 36 total classes...');
  console.log(`📊 Starting Phase 2 with ${schedule.length} classes, need ${TARGET_CLASSES - schedule.length} more`);
  
  // DEBUG: Log all filled slots
  const filledSlots = schedule.map(s => `${s.day}-${s.time}: ${s.subject_name}${s.is_continuation ? ' (cont.)' : ''}`);
  console.log('📋 Currently filled slots:', filledSlots);
  
  let attempts = 0;
  const maxAttempts = 200; // Increased from 100

  while (schedule.length < TARGET_CLASSES && attempts < maxAttempts) {
    attempts++;
    let slotFilled = false;

    // Try to fill each empty slot
    for (const day of days) {
      for (const timeSlot of timeSlots) {
        if (schedule.length >= TARGET_CLASSES) break;

        // Check if this slot is empty
        const slotTaken = schedule.some(s => s.day === day && s.time === timeSlot.time);
        if (slotTaken) {
          // Slot already has a class, skip it
          continue;
        }

        console.log(`🔍 Attempt ${attempts}: Trying to fill ${day} ${timeSlot.time}...`);

        // Find a subject that can be scheduled here
        // Prioritize theory subjects and those with fewer hours assigned
        // EXCLUDE subjects that have already met their minimum requirements in Phase 1
        const eligibleSubjects = sortedSubjects.filter(subject => {
          const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
          const hoursAssigned = subjectHoursAssigned.get(subject.id) || 0;
          const minRequired = subject.credits_per_week || 3;
          
          // For labs: only include if they haven't met minimum hours yet
          // For theory: always include (can have multiple sessions)
          if (isLab) {
            return hoursAssigned < minRequired;
          }
          return true; // Theory subjects can always be added
        });

        const subjectsByHours = [...eligibleSubjects].sort((a, b) => {
          const hoursA = subjectHoursAssigned.get(a.id) || 0;
          const hoursB = subjectHoursAssigned.get(b.id) || 0;
          return hoursA - hoursB;
        });

        for (const subject of subjectsByHours) {
          const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
          
          // Find qualified faculty
          const qualifiedFaculty = facultyQualifications.filter(
            (fq: any) => fq.subject_id === subject.id
          );

          if (qualifiedFaculty.length === 0) continue;

          // Select least loaded faculty
          const availableFaculty = qualifiedFaculty.sort((a: any, b: any) => {
            const loadA = facultyWorkload.get(a.faculty_id) || 0;
            const loadB = facultyWorkload.get(b.faculty_id) || 0;
            return loadA - loadB;
          });

          let classAdded = false;

          for (const fq of availableFaculty) {
            const faculty = Array.isArray(fq.faculty) ? fq.faculty[0] : fq.faculty;
            if (!faculty) continue;

            // Check if faculty is available
            const facultyBusy = schedule.some(
              s => s.day === day && s.time === timeSlot.time && s.faculty_id === faculty.id
            );

            if (facultyBusy) continue;

            // Find appropriate room based on subject type
            let availableRooms = isLab ? labs : classrooms;
            
            // Fallback: if no appropriate rooms, use the other type
            if (availableRooms.length === 0) {
              availableRooms = isLab ? classrooms : labs;
            }
            
            if (availableRooms.length === 0) {
              console.warn(`⚠️ No rooms available at all for ${day} ${timeSlot.time}`);
              continue; // No rooms at all
            }
            
            // Try to find an available room
            let classroom = availableRooms.find((room: any) => {
              // Check if room is available
              const roomBusy = schedule.some(
                s => s.day === day && s.time === timeSlot.time && s.classroom_id === room.id
              );
              
              // Relaxed constraints for Phase 2
              const hasProjector = subject.requires_projector ? room.has_projector : true;
              const hasCapacity = room.capacity >= (batchInfo?.expected_strength || 60);
              
              return !roomBusy && hasProjector && hasCapacity;
            });

            // If no perfect match, try any available room
            if (!classroom) {
              console.log(`⚠️ No perfect room, trying any available room...`);
              classroom = availableRooms.find((room: any) => {
                const roomBusy = schedule.some(
                  s => s.day === day && s.time === timeSlot.time && s.classroom_id === room.id
                );
                return !roomBusy;
              });
            }

            if (!classroom) {
              console.warn(`⚠️ All rooms busy for ${day} ${timeSlot.time}`);
              continue;
            }

            console.log(`✅ Found room ${classroom.name} for ${subject.name}`);

            // Add the class - handle labs with 2-hour blocks if possible
            const currentHours = subjectHoursAssigned.get(subject.id) || 0;
            const currentSlotIndex = timeSlots.findIndex(ts => ts.time === timeSlot.time);
            
            // For labs in Phase 2, try to find consecutive slots
            if (isLab && currentSlotIndex < timeSlots.length - 1) {
              const nextSlot = timeSlots[currentSlotIndex + 1];
              const nextSlotTaken = schedule.some(s => s.day === day && s.time === nextSlot.time);
              
              const nextFacultyBusy = schedule.some(
                s => s.day === day && s.time === nextSlot.time && s.faculty_id === faculty.id
              );
              const nextRoomBusy = schedule.some(
                s => s.day === day && s.time === nextSlot.time && s.classroom_id === classroom.id
              );
              
              if (!nextSlotTaken && !nextFacultyBusy && !nextRoomBusy) {
                // Can schedule 2-hour lab block
                schedule.push({
                  id: `schedule-${scheduleIndex++}`,
                  subject_id: subject.id,
                  subject_name: subject.name,
                  subject_code: subject.code,
                  subject_type: subject.subject_type,
                  faculty_id: faculty.id,
                  faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                  classroom_id: classroom?.id || null,
                  classroom_name: classroom?.name || 'TBA',
                  day: day,
                  time: timeSlot.time,
                  displayTime: timeSlot.displayTime,
                  duration: 2,
                  semester: semester,
                  is_lab: true,
                  session_number: currentHours + 1
                });

                schedule.push({
                  id: `schedule-${scheduleIndex++}`,
                  subject_id: subject.id,
                  subject_name: `${subject.name} (Lab cont.)`,
                  subject_code: subject.code,
                  subject_type: subject.subject_type,
                  faculty_id: faculty.id,
                  faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                  classroom_id: classroom?.id || null,
                  classroom_name: classroom?.name || 'TBA',
                  day: day,
                  time: nextSlot.time,
                  displayTime: nextSlot.displayTime,
                  duration: 1,
                  semester: semester,
                  is_lab: true,
                  is_continuation: true,
                  session_number: currentHours + 1
                });

                facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 2);
                subjectHoursAssigned.set(subject.id, currentHours + 2);
                slotFilled = true;
                classAdded = true;
                
                console.log(`✅ Added 2-hour lab #${schedule.length - 1},${schedule.length}: ${subject.name} on ${day} ${timeSlot.time}-${nextSlot.time} with ${faculty.first_name} in ${classroom.name}`);
                break; // Successfully added lab, move to next subject
              }
            }
            
            // Single hour slot (theory or lab that couldn't get consecutive slots)
            schedule.push({
              id: `schedule-${scheduleIndex++}`,
              subject_id: subject.id,
              subject_name: subject.name,
              subject_code: subject.code,
              subject_type: subject.subject_type,
              faculty_id: faculty.id,
              faculty_name: `${faculty.first_name} ${faculty.last_name}`,
              classroom_id: classroom?.id || null,
              classroom_name: classroom?.name || 'TBA',
              day: day,
              time: timeSlot.time,
              displayTime: timeSlot.displayTime,
              duration: 1,
              semester: semester,
              is_lab: isLab,
              session_number: currentHours + 1
            });

            facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 1);
            subjectHoursAssigned.set(subject.id, currentHours + 1);
            slotFilled = true;
            classAdded = true;
            
            console.log(`✅ Added class #${schedule.length}: ${subject.name} on ${day} ${timeSlot.time} with ${faculty.first_name} in ${classroom.name}`);
            break;
          }

          if (classAdded) break;
        }

        if (schedule.length >= TARGET_CLASSES) break;
      }
    }

    // If we couldn't fill any slot in this iteration, break to avoid infinite loop
    if (!slotFilled) {
      console.warn(`⚠️ Could not fill any more slots in attempt ${attempts}. Reached ${schedule.length} classes.`);
      console.warn(`   Faculty workload:`, Array.from(facultyWorkload.entries()).map(([id, hours]) => `${id.slice(0,8)}: ${hours}h`));
      console.warn(`   Subject hours:`, Array.from(subjectHoursAssigned.entries()).map(([id, hours]) => `${id.slice(0,8)}: ${hours}h`));
      break;
    }
  }

  console.log(`✅ Phase 2 complete: ${schedule.length} total classes assigned`);
  console.log('📊 Phase 2 Summary:');
  console.log(`   - Target classes: ${TARGET_CLASSES}`);
  console.log(`   - Actual classes: ${schedule.length}`);
  console.log(`   - Attempts made: ${attempts}/${maxAttempts}`);
  console.log(`   - Gap: ${TARGET_CLASSES - schedule.length} classes short`);

  // Calculate statistics
  const uniqueFaculty = new Set(schedule.map(s => s.faculty_id)).size;
  const uniqueSubjects = new Set(schedule.map(s => s.subject_id)).size;

  const statistics = {
    totalSubjects: subjects.length,
    totalAssignments: schedule.length,
    uniqueSessions: schedule.filter(s => !s.is_continuation).length,
    theoryAssignments: schedule.filter((s: any) => !s.is_lab && !s.is_continuation).length,
    labAssignments: schedule.filter((s: any) => s.is_lab && !s.is_continuation).length,
    facultyUtilization: Array.from(facultyWorkload.entries()).map(([id, hours]) => {
      const facultyInfo = facultyQualifications.find((f: any) => f.faculty_id === id);
      const faculty = facultyInfo?.faculty;
      return {
        faculty_id: id,
        faculty_name: faculty ? `${faculty.first_name} ${faculty.last_name}` : 'Unknown',
        hours_assigned: hours
      };
    }),
    subjectDistribution: Array.from(subjectHoursAssigned.entries()).map(([id, hours]) => {
      const subject = subjects.find((s: any) => s.id === id);
      return {
        subject_id: id,
        subject_name: subject?.name || 'Unknown',
        subject_code: subject?.code || 'N/A',
        hours_assigned: hours
      };
    }),
    conflictsDetected: conflicts.length,
    completionRate: ((schedule.length / TARGET_CLASSES) * 100).toFixed(1),
    gridCoverage: ((schedule.length / TOTAL_SLOTS) * 100).toFixed(1),
    facultyCount: uniqueFaculty,
    subjectsScheduled: uniqueSubjects,
    targetClasses: TARGET_CLASSES,
    actualClasses: schedule.length
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
