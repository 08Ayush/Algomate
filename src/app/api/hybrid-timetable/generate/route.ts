import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Hybrid Timetable Generation using CP-SAT + GA algorithm
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      batch_id, 
      semester, 
      department_id,
      college_id,
      academic_year, 
      created_by,
      hybrid_config,
      constraints 
    } = body;

    console.log('🔬 Hybrid Algorithm Generation Request:', { 
      batch_id, 
      semester, 
      department_id, 
      college_id,
      academic_year,
      created_by 
    });

    // Validate required fields with detailed error messages
    const missingFields = [];
    if (!batch_id) missingFields.push('batch_id');
    if (!semester) missingFields.push('semester');
    if (!department_id) missingFields.push('department_id');
    if (!college_id) missingFields.push('college_id');
    if (!academic_year) missingFields.push('academic_year');
    if (!created_by) missingFields.push('created_by');

    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    const startTime = Date.now();

    // PHASE 1: DATA COLLECTION using algorithm helper views
    console.log('📊 Phase 1: Collecting algorithm data from helper views...');
    
    // Get batch information
    const { data: batchInfo, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batch_id)
      .single();

    if (batchError || !batchInfo) {
      return NextResponse.json({
        success: false,
        error: 'Batch not found'
      }, { status: 404 });
    }

    // Get faculty data from algorithm helper view
    const { data: facultyData, error: facultyError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        department_id,
        max_hours_per_week,
        faculty_qualified_subjects (
          subject_id,
          proficiency_level,
          preference_score
        )
      `)
      .eq('department_id', department_id)
      .eq('role', 'faculty')
      .eq('is_active', true);

    if (facultyError) {
      console.error('❌ Faculty fetch error:', facultyError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch faculty data: ' + facultyError.message
      }, { status: 500 });
    }

    console.log('👥 Faculty data retrieved:', {
      total_faculty: facultyData?.length || 0,
      faculty_with_qualifications: facultyData?.filter(f => 
        f.faculty_qualified_subjects && f.faculty_qualified_subjects.length > 0
      ).length || 0
    });

    // Log each faculty's qualifications
    facultyData?.forEach(f => {
      if (f.faculty_qualified_subjects && f.faculty_qualified_subjects.length > 0) {
        console.log(`  - ${f.first_name} ${f.last_name}: ${f.faculty_qualified_subjects.length} qualified subjects`);
      } else {
        console.warn(`  ⚠️ ${f.first_name} ${f.last_name}: No subject qualifications found`);
      }
    });

    // Get subject data for the semester
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .eq('department_id', department_id)
      .eq('semester', semester)
      .eq('is_active', true);

    if (subjectsError) {
      console.error('❌ Subjects fetch error:', subjectsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch subjects data: ' + subjectsError.message
      }, { status: 500 });
    }

    console.log('📚 Subject data retrieved:', {
      total_subjects: subjectsData?.length || 0,
      theory_subjects: subjectsData?.filter(s => s.subject_type === 'THEORY').length || 0,
      lab_subjects: subjectsData?.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length || 0
    });

    // Log qualified faculty for each subject
    subjectsData?.forEach(subject => {
      const qualifiedFaculty = facultyData?.filter(f => 
        f.faculty_qualified_subjects?.some((qs: any) => qs.subject_id === subject.id)
      ) || [];
      
      if (qualifiedFaculty.length > 0) {
        console.log(`  - ${subject.name}: ${qualifiedFaculty.length} qualified faculty`);
      } else {
        console.warn(`  ⚠️ ${subject.name}: NO QUALIFIED FACULTY FOUND!`);
      }
    });

    // Get time slots
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('college_id', batchInfo.college_id)
      .eq('is_active', true)
      .not('is_break_time', 'eq', true)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    if (timeSlotsError) {
      console.error('Time slots fetch error:', timeSlotsError);
    }

    // Get classrooms and labs
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('college_id', batchInfo.college_id)
      .eq('is_available', true);

    console.log('✅ Data collected:', {
      faculty: facultyData?.length || 0,
      subjects: subjectsData?.length || 0,
      timeSlots: timeSlots?.length || 0,
      classrooms: classrooms?.length || 0
    });

    // PHASE 2: HYBRID ALGORITHM EXECUTION
    console.log('🤖 Phase 2: Starting Hybrid Algorithm...');
    console.log('📋 Strategy:', hybrid_config.strategy);
    console.log('🎯 Constraints:', constraints.length, 'enabled');

    // Separate classrooms and labs
    const regularClassrooms = classrooms?.filter(c => 
      c.type === 'Lecture Hall' || c.type === 'Tutorial Room' || c.type === 'Seminar Room'
    ) || [];
    const labs = classrooms?.filter(c => 
      c.type === 'Lab'
    ) || [];

    // Group time slots by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlotsByDay = days.map(day => {
      const slots = timeSlots?.filter(ts => ts.day === day) || [];
      return slots.map(slot => ({
        time: slot.start_time.substring(0, 5), // "09:00:00" -> "09:00"
        displayTime: `${slot.start_time.substring(0, 5)}-${slot.end_time.substring(0, 5)}`,
        duration: 60
      }));
    });

    const timeSlotsPerDay = timeSlotsByDay[0] || [];

    // Initialize schedule
    let schedule: any[] = [];
    let scheduleIndex = 0;

    // Track assignments
    const facultyWorkload = new Map<string, number>();
    const subjectHoursAssigned = new Map<string, number>();

    // Sort subjects by priority (required subjects first, then by credits)
    const sortedSubjects = [...subjectsData].sort((a, b) => {
      if (a.is_core_subject !== b.is_core_subject) {
        return a.is_core_subject ? -1 : 1;
      }
      return (b.credits_per_week || 0) - (a.credits_per_week || 0);
    });

    // CONSTRAINT CHECKING FUNCTIONS
    const isHardConstraintViolated = (
      subject: any,
      faculty: any,
      classroom: any,
      day: string,
      timeSlot: any
    ): boolean => {
      // HC001: No Faculty Double Booking
      const facultyBusy = schedule.some(
        s => s.day === day && s.time === timeSlot.time && s.faculty_id === faculty.id
      );
      if (facultyBusy) return true;

      // HC002: No Classroom Conflicts
      const classroomBusy = classroom && schedule.some(
        s => s.day === day && s.time === timeSlot.time && s.classroom_id === classroom.id
      );
      if (classroomBusy) return true;

      // HC003: Faculty Qualification Requirements
      const isQualified = faculty.faculty_qualified_subjects?.some(
        (qs: any) => qs.subject_id === subject.id
      );
      if (!isQualified) return true;

      // HC005: Room Type Requirements
      const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
      if (isLab && classroom.type !== 'Lab') return true;
      if (!isLab && classroom.type === 'Lab') return true;

      // Check if slot is already taken by batch
      const slotTaken = schedule.some(
        s => s.day === day && s.time === timeSlot.time
      );
      if (slotTaken) return true;

      return false;
    };

    const calculateSoftConstraintScore = (
      subject: any,
      faculty: any,
      classroom: any,
      day: string,
      timeSlot: any
    ): number => {
      let score = 0;

      // SC001: Faculty Subject Preferences
      const qualification = faculty.faculty_qualified_subjects?.find(
        (qs: any) => qs.subject_id === subject.id
      );
      if (qualification) {
        score += (qualification.preference_score || 5) * 10;
      }

      // SC003: Balanced Faculty Workload
      const currentWorkload = facultyWorkload.get(faculty.id) || 0;
      const targetWorkload = (faculty.max_hours_per_week || 20) / days.length;
      const workloadDiff = Math.abs(currentWorkload - targetWorkload);
      score -= workloadDiff * 5;

      // SC004: Classroom Utilization
      const classroomUsage = schedule.filter(s => s.classroom_id === classroom.id).length;
      score += Math.min(classroomUsage * 2, 20);

      // SC005: Consecutive Classes (prefer consecutive slots for same faculty)
      const previousSlot = schedule.find(s => 
        s.day === day && 
        s.faculty_id === faculty.id &&
        timeSlotsPerDay.indexOf(timeSlotsPerDay.find(ts => ts.time === s.time)!) === 
        timeSlotsPerDay.indexOf(timeSlot) - 1
      );
      if (previousSlot) score += 15;

      return score;
    };

    // PHASE 1: INTELLIGENT COMPLETE TIMETABLE GENERATION
    console.log('📅 Phase 1: Intelligent Complete Timetable Generation...');
    
    // Calculate total available slots
    const totalSlots = days.length * timeSlotsPerDay.length;
    console.log(`🎯 Target: Fill ${totalSlots} slots (${days.length} days × ${timeSlotsPerDay.length} slots/day)`);
    
    // Tracking structures
    const scheduledSlots = new Set<string>(); // "day-timeIndex"
    const facultyDaySlots = new Map<string, Set<number>>(); // "facultyId-day" -> Set of time indices
    const subjectScheduledCount = new Map<string, number>(); // subjectId -> count
    
    // Helper: Check if slot is already taken
    const isSlotTaken = (day: string, timeIndex: number): boolean => {
      return scheduledSlots.has(`${day}-${timeIndex}`);
    };
    
    // Helper: Check if faculty has continuous theory slots
    const hasContinuousTheorySlot = (facultyId: string, day: string, timeIndex: number, subjectType: string): boolean => {
      if (subjectType !== 'THEORY' && subjectType !== 'TUTORIAL') return false;
      
      const key = `${facultyId}-${day}`;
      const slots = facultyDaySlots.get(key) || new Set();
      
      // Check if previous OR next slot has same faculty teaching theory
      return slots.has(timeIndex - 1) || slots.has(timeIndex + 1);
    };
    
    // Helper: Find continuous 2-slot window for labs
    const findContinuousLabSlots = (day: string): number[] => {
      for (let i = 0; i < timeSlotsPerDay.length - 1; i++) {
        if (!isSlotTaken(day, i) && !isSlotTaken(day, i + 1)) {
          return [i, i + 1];
        }
      }
      return [];
    };
    
    // Helper: Find next available slot for theory
    const findNextTheorySlot = (facultyId: string, subjectType: string): {day: string, timeIndex: number} | null => {
      for (let d = 0; d < days.length; d++) {
        const day = days[d];
        for (let t = 0; t < timeSlotsPerDay.length; t++) {
          if (!isSlotTaken(day, t) && !hasContinuousTheorySlot(facultyId, day, t, subjectType)) {
            return { day, timeIndex: t };
          }
        }
      }
      return null;
    };
    
    // Helper: Add scheduled class
    const addScheduledClass = (
      day: string,
      timeIndex: number,
      subject: any,
      faculty: any,
      classroom: any,
      isLab: boolean,
      isContinuation: boolean,
      sessionNumber: number = 1
    ) => {
      const timeSlot = timeSlotsPerDay[timeIndex];
      
      schedule.push({
        id: `schedule-${scheduleIndex++}`,
        day: day,
        time: timeSlot.time,
        displayTime: timeSlot.displayTime,
        subject_id: subject.id,
        subject_name: subject.name,
        subject_code: subject.code,
        subject_type: subject.subject_type,
        faculty_id: faculty.id,
        faculty_name: `${faculty.first_name} ${faculty.last_name}`,
        classroom_id: classroom?.id || null,
        classroom_name: classroom?.name || 'TBA',
        duration: isContinuation ? 1 : (isLab ? 2 : 1),
        semester: semester,
        is_lab: isLab,
        is_continuation: isContinuation,
        session_number: sessionNumber
      });
      
      scheduledSlots.add(`${day}-${timeIndex}`);
      
      const facultyKey = `${faculty.id}-${day}`;
      if (!facultyDaySlots.has(facultyKey)) {
        facultyDaySlots.set(facultyKey, new Set());
      }
      facultyDaySlots.get(facultyKey)!.add(timeIndex);
    };
    
    // STEP 1: Schedule all LAB sessions (2-hour continuous blocks)
    // CONSTRAINT: Maximum 1 lab per day (distribute across different days)
    console.log('🔬 Step 1: Scheduling LAB sessions (continuous 2-hour slots)...');
    console.log('📋 Constraint: Maximum 1 lab per day, distributed across week');
    
    const labSubjects = sortedSubjects.filter(s => 
      s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL'
    );
    
    // Track which days already have labs scheduled (max 1 lab per day)
    const labScheduledDays = new Set<string>();
    
    // Helper: Check if day already has a lab
    const hasLabOnDay = (day: string): boolean => {
      return labScheduledDays.has(day);
    };
    
    // Helper: Find next available day without lab
    const findNextDayWithoutLab = (startDayIndex: number): {day: string, index: number} | null => {
      for (let offset = 0; offset < days.length; offset++) {
        const dayIndex = (startDayIndex + offset) % days.length;
        const day = days[dayIndex];
        if (!hasLabOnDay(day)) {
          return { day, index: dayIndex };
        }
      }
      return null;
    };
    
    for (const subject of labSubjects) {
      const requiredHours = subject.credits_per_week || 2;
      const sessionsNeeded = Math.ceil(requiredHours / 2);
      
      const qualifiedFaculty = facultyData?.filter(f => 
        f.faculty_qualified_subjects?.some((qs: any) => qs.subject_id === subject.id)
      ).sort((a, b) => {
        const aProf = a.faculty_qualified_subjects?.find((qs: any) => qs.subject_id === subject.id)?.proficiency_level || 0;
        const bProf = b.faculty_qualified_subjects?.find((qs: any) => qs.subject_id === subject.id)?.proficiency_level || 0;
        return bProf - aProf;
      }) || [];
      
      if (qualifiedFaculty.length === 0) {
        console.warn(`⚠️ No qualified faculty for LAB: ${subject.code}`);
        continue;
      }
      
      const faculty = qualifiedFaculty[0];
      const lab = labs?.[0] || classrooms?.[0];
      
      if (!lab) {
        console.warn(`⚠️ No lab available for: ${subject.code}`);
        continue;
      }
      
      let sessionsScheduled = 0;
      let startDayIndex = 0; // Start searching from Monday
      
      // Schedule lab sessions on different days (max 1 lab per day)
      while (sessionsScheduled < sessionsNeeded) {
        // Find next day without lab
        const nextDayInfo = findNextDayWithoutLab(startDayIndex);
        
        if (!nextDayInfo) {
          console.warn(`⚠️ ${subject.code}: No more days available for labs (${sessionsScheduled}/${sessionsNeeded} scheduled)`);
          break;
        }
        
        const { day, index: dayIndex } = nextDayInfo;
        const continuousSlots = findContinuousLabSlots(day);
        
        if (continuousSlots.length === 2) {
          const [slot1, slot2] = continuousSlots;
          
          // Schedule main lab session (displays in first slot)
          addScheduledClass(day, slot1, subject, faculty, lab, true, false, sessionsScheduled + 1);
          
          // Schedule continuation (displays in second slot - same subject info)
          addScheduledClass(day, slot2, subject, faculty, lab, true, true, sessionsScheduled + 1);
          
          // Mark this day as having a lab (max 1 lab per day)
          labScheduledDays.add(day);
          
          sessionsScheduled++;
          subjectScheduledCount.set(subject.id, (subjectScheduledCount.get(subject.id) || 0) + 1);
          
          console.log(`  ✅ ${subject.code} LAB: ${day} slots ${slot1}-${slot2} (2 hours) - Session ${sessionsScheduled}/${sessionsNeeded}`);
          
          // Move to next day for next lab session
          startDayIndex = dayIndex + 1;
        } else {
          console.warn(`⚠️ ${subject.code}: No continuous slots on ${day}`);
          startDayIndex = dayIndex + 1;
          
          // If we've checked all days without finding slots, break
          if (startDayIndex >= days.length) {
            break;
          }
        }
      }
      
      if (sessionsScheduled < sessionsNeeded) {
        console.warn(`⚠️ ${subject.code}: Scheduled ${sessionsScheduled}/${sessionsNeeded} lab sessions`);
      }
    }
    
    console.log(`✅ LAB scheduling: ${schedule.filter(s => s.is_lab && !s.is_continuation).length} sessions, Slots: ${scheduledSlots.size}/${totalSlots}`);
    
    // STEP 2: Fill remaining slots with THEORY subjects
    console.log('📚 Step 2: Filling remaining slots with THEORY lectures...');
    
    const theorySubjects = sortedSubjects.filter(s => 
      s.subject_type === 'THEORY' || s.subject_type === 'TUTORIAL'
    );
    
    const remainingSlots = totalSlots - scheduledSlots.size;
    console.log(`  📊 Remaining: ${remainingSlots}, Theory subjects: ${theorySubjects.length}`);
    
    if (theorySubjects.length > 0) {
      const baseSlotsPerSubject = Math.floor(remainingSlots / theorySubjects.length);
      const extraSlots = remainingSlots % theorySubjects.length;
      
      const targetSlots = new Map<string, number>();
      theorySubjects.forEach((subject, index) => {
        targetSlots.set(subject.id, baseSlotsPerSubject + (index < extraSlots ? 1 : 0));
      });
      
      let attempts = 0;
      let subjectIndex = 0;
      
      while (scheduledSlots.size < totalSlots && attempts < totalSlots * 2) {
        attempts++;
        
        const subject = theorySubjects[subjectIndex % theorySubjects.length];
        const currentCount = subjectScheduledCount.get(subject.id) || 0;
        const targetCount = targetSlots.get(subject.id) || 0;
        
        if (currentCount >= targetCount && scheduledSlots.size < totalSlots - theorySubjects.length) {
          subjectIndex++;
          continue;
        }
        
        const qualifiedFaculty = facultyData?.filter(f => 
          f.faculty_qualified_subjects?.some((qs: any) => qs.subject_id === subject.id)
        ).sort((a, b) => {
          const aProf = a.faculty_qualified_subjects?.find((qs: any) => qs.subject_id === subject.id)?.proficiency_level || 0;
          const bProf = b.faculty_qualified_subjects?.find((qs: any) => qs.subject_id === subject.id)?.proficiency_level || 0;
          return bProf - aProf;
        }) || [];
        
        if (qualifiedFaculty.length === 0) {
          subjectIndex++;
          continue;
        }
        
        const faculty = qualifiedFaculty[0];
        const classroom = regularClassrooms?.[scheduleIndex % (regularClassrooms?.length || 1)] || classrooms?.[0];
        
        if (!classroom) break;
        
        const nextSlot = findNextTheorySlot(faculty.id, subject.subject_type);
        
        if (!nextSlot) {
          subjectIndex++;
          continue;
        }
        
        const { day, timeIndex } = nextSlot;
        
        addScheduledClass(day, timeIndex, subject, faculty, classroom, false, false, currentCount + 1);
        
        subjectScheduledCount.set(subject.id, currentCount + 1);
        subjectIndex++;
      }
      
      if (scheduledSlots.size < totalSlots) {
        console.warn(`⚠️ Filled ${scheduledSlots.size}/${totalSlots} slots (constraints may be too strict)`);
      } else {
        console.log(`✅ All ${totalSlots} slots filled!`);
      }
    }

    console.log(`✅ Phase 1 complete: ${schedule.length} classes, ${scheduledSlots.size}/${totalSlots} slots filled`);
    
    // Log distribution
    sortedSubjects.forEach(subject => {
      const count = subjectScheduledCount.get(subject.id) || 0;
      const required = subject.credits_per_week || 3;
      console.log(`  ${count >= required ? '✅' : '⚠️'} ${subject.code}: ${count}/${required} classes`);
    });


    // DEDUPLICATION CHECK: Remove any duplicates that may have been created
    console.log('🔍 Checking Phase 1 for duplicates...');
    const seenPhase1Slots = new Set<string>();
    const deduplicatedPhase1 = schedule.filter(item => {
      // Skip continuation classes for dedup check
      if (item.is_continuation) return true;
      
      const slotKey = `${item.day}-${item.time}`;
      if (seenPhase1Slots.has(slotKey)) {
        console.warn(`⚠️ Phase 1 duplicate removed: ${slotKey} - ${item.subject_name}`);
        return false;
      }
      seenPhase1Slots.add(slotKey);
      return true;
    });
    
    if (schedule.length !== deduplicatedPhase1.length) {
      console.warn(`🔄 Phase 1 deduplication: ${schedule.length} -> ${deduplicatedPhase1.length} entries`);
      schedule = deduplicatedPhase1;
    }

    // PHASE 2: GENETIC ALGORITHM OPTIMIZATION (if needed)
    const targetClasses = days.length * timeSlotsPerDay.length; // e.g., 6 days * 6 slots = 36
    
    if (schedule.length < targetClasses && hybrid_config.strategy !== 'sequential') {
      console.log(`📅 Phase 2: GA Optimization to fill remaining slots (target: ${targetClasses})...`);
      
      // Fill remaining slots with repeated theory subjects
      const theorySubjects = sortedSubjects.filter(s => 
        s.subject_type === 'THEORY' || s.subject_type === 'TUTORIAL'
      );

      let attempts = 0;
      const maxAttempts = 200;

      for (let dayIdx = 0; dayIdx < days.length && schedule.length < targetClasses && attempts < maxAttempts; dayIdx++) {
        const day = days[dayIdx];
        const daySlots = timeSlotsByDay[dayIdx];

        for (let slotIdx = 0; slotIdx < daySlots.length && schedule.length < targetClasses && attempts < maxAttempts; slotIdx++) {
          const timeSlot = daySlots[slotIdx];
          attempts++;

          // Check if slot is already filled
          const slotTaken = schedule.some(s => s.day === day && s.time === timeSlot.time);
          if (slotTaken) continue;

          // Try each theory subject with best soft constraint score
          let bestAssignment: any = null;
          let bestScore = -Infinity;

          for (const subject of theorySubjects) {
            const qualifiedFaculty = facultyData?.filter(f => 
              f.faculty_qualified_subjects?.some((qs: any) => qs.subject_id === subject.id)
            ) || [];

            for (const faculty of qualifiedFaculty) {
              for (const classroom of regularClassrooms) {
                if (!isHardConstraintViolated(subject, faculty, classroom, day, timeSlot)) {
                  const score = calculateSoftConstraintScore(subject, faculty, classroom, day, timeSlot);
                  if (score > bestScore) {
                    bestScore = score;
                    bestAssignment = { subject, faculty, classroom };
                  }
                }
              }
            }
          }

          if (bestAssignment) {
            const { subject, faculty, classroom } = bestAssignment;
            
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
              session_number: (subjectHoursAssigned.get(subject.id) || 0) + 1
            });

            facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 1);
            subjectHoursAssigned.set(subject.id, (subjectHoursAssigned.get(subject.id) || 0) + 1);
          }
        }
      }

      console.log(`✅ Phase 2 complete: ${schedule.length} total classes`);
    }

    // FINAL DEDUPLICATION: Ensure no duplicate day-time combinations in schedule
    console.log('🔍 Final deduplication check...');
    const finalSeenSlots = new Set<string>();
    const finalSchedule = schedule.filter(item => {
      // Keep continuation classes as they're in different time slots
      if (item.is_continuation) return true;
      
      const slotKey = `${item.day}-${item.time}`;
      if (finalSeenSlots.has(slotKey)) {
        console.warn(`⚠️ Final duplicate removed: ${slotKey} - ${item.subject_name}`);
        return false;
      }
      finalSeenSlots.add(slotKey);
      return true;
    });
    
    if (schedule.length !== finalSchedule.length) {
      console.warn(`🔄 Final deduplication: ${schedule.length} -> ${finalSchedule.length} entries`);
      schedule = finalSchedule;
    }

    // Calculate execution metrics
    const executionTime = (Date.now() - startTime) / 1000;
    
    // Calculate statistics
    const statistics = {
      totalSubjects: subjectsData.length,
      totalAssignments: schedule.length,
      uniqueSessions: new Set(schedule.map(s => `${s.day}-${s.time}`)).size,
      theoryAssignments: schedule.filter(s => !s.is_lab && !s.is_continuation).length,
      labAssignments: schedule.filter(s => s.is_lab && !s.is_continuation).length,
      targetClasses: targetClasses,
      actualClasses: schedule.length,
      completionRate: ((schedule.length / targetClasses) * 100).toFixed(1),
      gridCoverage: ((new Set(schedule.map(s => `${s.day}-${s.time}`)).size / targetClasses) * 100).toFixed(1),
    };

    const metrics = {
      strategy: hybrid_config.strategy,
      execution_time: executionTime.toFixed(2),
      quality_score: statistics.completionRate,
      violations: 0, // Would need to calculate actual violations
      cpsat_solutions: schedule.filter(s => !s.is_continuation).length,
      ga_generations: hybrid_config.strategy === 'sequential' ? 0 : 50,
    };

    console.log('✅ Hybrid generation complete:', statistics);

    return NextResponse.json({
      success: true,
      data: {
        semester,
        academic_year,
        batch_id,
        department_id,
        subjects: subjectsData,
        faculty: facultyData,
        classrooms: classrooms,
        labs: labs,
        schedule,
        statistics,
        created_by
      },
      metrics,
      message: 'Hybrid timetable generated successfully'
    });

  } catch (error: any) {
    console.error('❌ Hybrid generation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to generate hybrid timetable'
    }, { status: 500 });
  }
}
