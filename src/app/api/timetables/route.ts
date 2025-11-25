import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  fetchConstraintRules, 
  validateConstraints, 
  calculateFitnessScore,
  type ScheduledClass,
  type TimeSlot
} from '@/lib/constraintRules';
import { createConstraintViolationNotifications } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      assignments, 
      createdBy, 
      academicYear, 
      semester, 
      departmentId, 
      collegeId,
      batchId,
      title 
    } = body;

    console.log('📥 Received timetable save request:', {
      assignmentsCount: assignments?.length,
      createdBy,
      academicYear,
      semester,
      departmentId: departmentId || 'not provided',
      collegeId: collegeId || 'not provided',
      batchId: batchId || 'not provided',
      title
    });

    // Validate critical fields
    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { 
          error: 'No assignments provided',
          success: false
        },
        { status: 400 }
      );
    }

    if (!createdBy || !academicYear || !semester) {
      console.error('❌ Missing critical fields:', {
        hasCreatedBy: !!createdBy,
        hasAcademicYear: !!academicYear,
        hasSemester: !!semester
      });
      return NextResponse.json(
        { 
          error: 'Missing required fields: createdBy, academicYear, or semester',
          success: false
        },
        { status: 400 }
      );
    }

    // Get or validate batch_id - REQUIRED by schema
    // We'll use provided department/college to find batch, or search by semester only
    let finalBatchId = batchId;
    let finalDepartmentId = departmentId;
    let finalCollegeId = collegeId;

    if (!finalBatchId) {
      console.log('🔍 No batch_id provided, searching for batch for semester', semester);
      
      // Build query dynamically based on available info
      let query = supabase
        .from('batches')
        .select('id, department_id, college_id')
        .eq('semester', semester)
        .eq('academic_year', academicYear)
        .eq('is_active', true);
      
      // Add filters if department/college provided
      if (finalDepartmentId) {
        query = query.eq('department_id', finalDepartmentId);
      }
      if (finalCollegeId) {
        query = query.eq('college_id', finalCollegeId);
      }
      
      const { data: batches, error: batchError } = await query.limit(1);
      
      if (batchError) {
        console.error('❌ Error fetching batch:', batchError);
        return NextResponse.json({
          error: 'Failed to find batch for this semester',
          success: false,
          details: batchError.message
        }, { status: 400 });
      }

      if (batches && batches.length > 0) {
        finalBatchId = batches[0].id;
        finalDepartmentId = batches[0].department_id;
        finalCollegeId = batches[0].college_id;
        console.log('✅ Found batch:', {
          batchId: finalBatchId,
          departmentId: finalDepartmentId,
          collegeId: finalCollegeId
        });
      } else {
        console.error('❌ No batch found for semester', semester);
        return NextResponse.json({
          error: `No active batch found for semester ${semester}. Please create a batch first.`,
          success: false
        }, { status: 400 });
      }
    } else {
      // Batch ID provided, fetch department and college from it
      console.log('📍 Batch ID provided, fetching department and college info...');
      const { data: batch, error: batchError } = await supabase
        .from('batches')
        .select('department_id, college_id')
        .eq('id', finalBatchId)
        .single();
      
      if (batchError || !batch) {
        console.error('❌ Invalid batch ID:', finalBatchId);
        return NextResponse.json({
          error: 'Invalid batch ID provided',
          success: false
        }, { status: 400 });
      }
      
      finalDepartmentId = batch.department_id;
      finalCollegeId = batch.college_id;
      console.log('✅ Got department and college from batch:', {
        departmentId: finalDepartmentId,
        collegeId: finalCollegeId
      });
    }

    // Validate that the user exists (created_by FK constraint)
    console.log('👤 Validating user exists:', createdBy);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('id', createdBy)
      .single();

    if (userError || !user) {
      console.error('❌ User not found:', createdBy);
      return NextResponse.json({
        error: 'Invalid user ID. User does not exist in database.',
        success: false,
        details: 'The createdBy user ID is not valid'
      }, { status: 400 });
    }

    console.log('✅ User validated:', {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role
    });

    // STEP 1: Create generation task (required by schema)
    console.log('📝 Creating generation task...');
    console.log('📋 Task data:', {
      task_name: title || `Manual Timetable - Semester ${semester}`,
      batch_id: finalBatchId,
      academic_year: academicYear,
      semester: semester,
      created_by: createdBy
    });

    const taskData = {
      task_name: title || `Manual Timetable - Semester ${semester}`,
      batch_id: finalBatchId,
      academic_year: academicYear,
      semester: semester,
      status: 'COMPLETED' as const,
      current_phase: 'COMPLETED' as const,
      progress: 100,
      current_message: 'Manual timetable creation completed',
      algorithm_config: {
        method: 'manual',
        created_at: new Date().toISOString()
      },
      created_by: createdBy,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      solutions_generated: 1,
      best_fitness_score: 100.0,
      execution_time_seconds: 0
    };

    const { data: task, error: taskError } = await supabase
      .from('timetable_generation_tasks')
      .insert(taskData)
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating generation task:', taskError);
      console.error('❌ Full error object:', JSON.stringify(taskError, null, 2));
      console.error('❌ Task data that failed:', JSON.stringify(taskData, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to create generation task',
          success: false,
          details: taskError.message,
          hint: taskError.hint,
          code: taskError.code
        },
        { status: 500 }
      );
    }

    console.log('✅ Created generation task:', task.id);

    // STEP 2: Create the timetable record
    const timetableData = {
      generation_task_id: task.id, // REQUIRED by schema
      title: title || `Semester ${semester} Timetable - ${academicYear}`,
      batch_id: finalBatchId, // REQUIRED by schema
      academic_year: academicYear,
      semester: semester,
      fitness_score: 100.0, // Manual timetables get perfect score
      constraint_violations: [],
      optimization_metrics: {
        method: 'manual_creation',
        total_assignments: assignments.length,
        created_at: new Date().toISOString()
      },
      generation_method: 'HYBRID', // Default, can be changed
      status: 'draft',
      created_by: createdBy,
      version: 1
    };

    console.log('💾 Creating timetable with data:', timetableData);

    const { data: timetable, error: timetableError } = await supabase
      .from('generated_timetables')
      .insert(timetableData)
      .select()
      .single();

    if (timetableError) {
      console.error('❌ Error creating timetable:', timetableError);
      // Cleanup: delete the task we created
      await supabase
        .from('timetable_generation_tasks')
        .delete()
        .eq('id', task.id);
      
      return NextResponse.json(
        { 
          error: 'Failed to create timetable',
          success: false,
          details: timetableError.message
        },
        { status: 500 }
      );
    }

    console.log('✅ Created timetable:', timetable.id);

    // STEP 3: Map time slots from frontend (day+time) to database UUIDs
    console.log('📍 Fetching time slots from database for mapping...');
    const { data: dbTimeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('id, day, start_time, end_time, duration_minutes')
      .eq('college_id', finalCollegeId)
      .eq('is_active', true);

    if (timeSlotsError || !dbTimeSlots || dbTimeSlots.length === 0) {
      console.error('❌ Error fetching time slots:', timeSlotsError);
      // Rollback
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      
      return NextResponse.json({
        error: 'No time slots found in database. Please set up time slots first.',
        success: false
      }, { status: 400 });
    }

    console.log('✅ Found', dbTimeSlots.length, 'time slots in database');
    
    // Log first few time slots to see their format
    console.log('📋 Sample database time slots (first 3):');
    dbTimeSlots.slice(0, 3).forEach(slot => {
      console.log(`  - Day: "${slot.day}", Start: "${slot.start_time}", End: "${slot.end_time}"`);
    });

    // Helper function to normalize time format (handles HH:MM:SS, HH:MM, H:MM)
    const normalizeTime = (time: string): string => {
      // Remove seconds if present (09:00:00 -> 09:00)
      const withoutSeconds = time.split(':').slice(0, 2).join(':');
      // Ensure 2-digit hours (9:00 -> 09:00)
      const [hours, minutes] = withoutSeconds.split(':');
      return `${hours.padStart(2, '0')}:${minutes}`;
    };

    // Create a map: "day-startTime" -> time_slot_id
    // Use normalized times for matching
    const timeSlotMap = new Map<string, string>();
    const timeSlotDetails = new Map<string, any>(); // For debugging
    
    dbTimeSlots.forEach(slot => {
      const normalizedStart = normalizeTime(slot.start_time);
      const key = `${slot.day}-${normalizedStart}`;
      timeSlotMap.set(key, slot.id);
      timeSlotDetails.set(key, {
        id: slot.id,
        day: slot.day,
        start_time: slot.start_time,
        normalized: normalizedStart
      });
    });

    console.log('📍 Created time slot mapping with', timeSlotMap.size, 'entries');
    console.log('📋 Sample mapping keys (first 5):', Array.from(timeSlotMap.keys()).slice(0, 5));

    // STEP 3.5: Fetch available classrooms (required by schema - classroom_id is NOT NULL)
    console.log('📍 Fetching classrooms from database...');
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('id, name, capacity, type')
      .eq('college_id', finalCollegeId)
      .eq('is_available', true)
      .order('capacity', { ascending: false }); // Prefer larger rooms first

    if (classroomsError || !classrooms || classrooms.length === 0) {
      console.error('❌ Error fetching classrooms:', classroomsError);
      // Rollback
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      
      return NextResponse.json({
        error: 'No classrooms found. Please set up classrooms before creating timetables.',
        success: false
      }, { status: 400 });
    }

    console.log('✅ Found', classrooms.length, 'available classrooms');
    console.log('📋 Classroom details:', classrooms.map(c => ({ name: c.name, type: c.type, capacity: c.capacity })));
    
    // Separate classrooms by type for better assignment
    // Check for various type names (case-insensitive)
    const regularClassrooms = classrooms.filter(c => {
      const type = c.type?.toLowerCase() || '';
      return type.includes('classroom') || type.includes('lecture') || type.includes('hall') || !c.type;
    });
    
    const labClassrooms = classrooms.filter(c => {
      const type = c.type?.toLowerCase() || '';
      return type.includes('lab');
    });
    
    console.log(`📊 Classroom breakdown: ${regularClassrooms.length} regular, ${labClassrooms.length} labs`);
    console.log(`📋 Regular classrooms: ${regularClassrooms.map(c => c.name).join(', ')}`);
    console.log(`📋 Lab classrooms: ${labClassrooms.map(c => c.name).join(', ')}`);

    // STEP 4: Create scheduled classes for each assignment
    console.log('📝 Creating', assignments.length, 'scheduled classes...');
    console.log('📋 Sample frontend assignment (first one):');
    if (assignments[0]) {
      console.log(`  - Subject ID: "${assignments[0].subject.id}"`);
      console.log(`  - Faculty ID: "${assignments[0].faculty.id}"`);
      console.log(`  - Classroom: "${assignments[0].classroom || 'none provided'}"`);
      console.log(`  - Day: "${assignments[0].timeSlot.day}", Start: "${assignments[0].timeSlot.startTime}"`);
    }
    
    // Helper to validate UUID format
    const isValidUUID = (id: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };
    
    const scheduledClasses: any[] = [];
    // Track which classrooms are occupied at which time slots to prevent conflicts
    // Key format: "Day-Time" (e.g., "Monday-09:00") -> Set of occupied classroom IDs
    const classroomOccupancy = new Map<string, Set<string>>();
    let classroomIndex = 0; // Round-robin classroom assignment
    
    for (let index = 0; index < assignments.length; index++) {
      const assignment = assignments[index];
      
      // Validate subject_id is a real UUID
      if (!isValidUUID(assignment.subject.id)) {
        console.error(`❌ Invalid subject UUID: "${assignment.subject.id}" for assignment ${index + 1}`);
        continue;
      }
      
      // Validate faculty_id is a real UUID
      if (!isValidUUID(assignment.faculty.id)) {
        console.error(`❌ Invalid faculty UUID: "${assignment.faculty.id}" for assignment ${index + 1}`);
        continue;
      }
      
      // Normalize the frontend time (remove seconds, pad hours)
      const normalizedFrontendTime = normalizeTime(assignment.timeSlot.startTime);
      
      // Map frontend time slot to database time_slot_id
      const timeSlotKey = `${assignment.timeSlot.day}-${normalizedFrontendTime}`;
      const dbTimeSlotId = timeSlotMap.get(timeSlotKey);

      if (!dbTimeSlotId) {
        console.warn(`⚠️ No database time slot found for "${timeSlotKey}" (original: "${assignment.timeSlot.day}-${assignment.timeSlot.startTime}")`);
        console.warn(`   Tried normalized key: "${timeSlotKey}"`);
        console.warn(`   Available keys (first 5): ${Array.from(timeSlotMap.keys()).slice(0, 5).join(', ')}...`);
        continue; // Skip this assignment
      }
      
      console.log(`✅ Matched "${timeSlotKey}" to time slot ${dbTimeSlotId}`);
      
      // Determine if this is a lab assignment FIRST (before classroom selection)
      const isLabAssignment = assignment.isLab || 
                             assignment.subject.requiresLab || 
                             (assignment.subject.subjectType && assignment.subject.subjectType.toLowerCase().includes('lab'));
      
      // Select appropriate classroom pool based on subject type
      let availableClassroomPool: typeof classrooms;
      
      if (isLabAssignment) {
        // For labs, prefer lab classrooms, but use all if no labs available
        availableClassroomPool = labClassrooms.length > 0 ? labClassrooms : classrooms;
        console.log(`🔬 Lab assignment detected, using ${availableClassroomPool.length} classrooms`);
      } else {
        // For regular classes, prefer lecture halls/classrooms, but use all if none available
        availableClassroomPool = regularClassrooms.length > 0 ? regularClassrooms : classrooms;
        console.log(`📚 Regular class, using ${availableClassroomPool.length} classrooms`);
      }
      
      // Assign classroom: Use provided one if valid, otherwise find an available classroom (conflict-free)
      let assignedClassroomId: string = availableClassroomPool[0].id; // Default to first classroom
      
      // Use day+time as occupancy key (NOT just dbTimeSlotId) to track across different batches
      const occupancyKey = timeSlotKey; // "Monday-09:00" format
      
      console.log(`🔍 Available classrooms for ${occupancyKey}: ${availableClassroomPool.map(c => c.name).join(', ')}`);
      
      // Initialize occupancy set for this day+time if not exists
      if (!classroomOccupancy.has(occupancyKey)) {
        classroomOccupancy.set(occupancyKey, new Set());
      }
      const occupiedClassrooms = classroomOccupancy.get(occupancyKey)!;
      
      if (assignment.classroom && isValidUUID(assignment.classroom)) {
        // Validate provided classroom exists and is not occupied at this time
        const classroomExists = availableClassroomPool.some(c => c.id === assignment.classroom);
        const isOccupied = occupiedClassrooms.has(assignment.classroom);
        
        if (classroomExists && !isOccupied) {
          assignedClassroomId = assignment.classroom;
          console.log(`✅ Using provided classroom: ${assignment.classroom}`);
        } else {
          // Find first available classroom from the appropriate pool
          let foundAvailable = false;
          for (let i = 0; i < availableClassroomPool.length; i++) {
            const testClassroom = availableClassroomPool[i];
            if (!occupiedClassrooms.has(testClassroom.id)) {
              assignedClassroomId = testClassroom.id;
              foundAvailable = true;
              console.warn(`⚠️ Provided classroom ${assignment.classroom} ${isOccupied ? 'occupied' : 'not found'}, using ${testClassroom.name}`);
              break;
            }
          }
          if (!foundAvailable) {
            // All classrooms in pool occupied - use first one anyway (conflict unavoidable)
            assignedClassroomId = availableClassroomPool[0].id;
            console.error(`❌ All ${isLabAssignment ? 'lab' : 'regular'} classrooms occupied at ${timeSlotKey}, assigning with conflict`);
          }
        }
      } else {
        // No classroom provided - find first available classroom from appropriate pool
        console.log(`🔍 Finding available classroom for ${occupancyKey}, currently occupied: ${Array.from(occupiedClassrooms).map(id => classrooms.find(c => c.id === id)?.name || id).join(', ')}`);
        
        let foundAvailable = false;
        for (let i = 0; i < availableClassroomPool.length; i++) {
          const testClassroom = availableClassroomPool[i];
          console.log(`  - Checking ${testClassroom.name} (${testClassroom.id}): ${occupiedClassrooms.has(testClassroom.id) ? 'OCCUPIED' : 'AVAILABLE'}`);
          
          if (!occupiedClassrooms.has(testClassroom.id)) {
            assignedClassroomId = testClassroom.id;
            foundAvailable = true;
            console.log(`✅ Auto-assigned available ${isLabAssignment ? 'lab' : 'classroom'}: ${testClassroom.name}`);
            break;
          }
        }
        if (!foundAvailable) {
          // All classrooms in pool occupied - use first one anyway (conflict unavoidable)
          assignedClassroomId = availableClassroomPool[0].id;
          console.error(`❌ All ${isLabAssignment ? 'lab' : 'regular'} classrooms occupied at ${timeSlotKey}, assigning with conflict to ${availableClassroomPool[0].name}`);
        }
      }
      
      // Mark this classroom as occupied at this time slot
      occupiedClassrooms.add(assignedClassroomId);
      
      const assignedClassroom = classrooms.find(c => c.id === assignedClassroomId);
      console.log(`📍 Classroom assignment for ${occupancyKey}: ${assignedClassroom?.name || assignedClassroomId} (${occupiedClassrooms.size}/${availableClassroomPool.length} ${isLabAssignment ? 'labs' : 'classrooms'} occupied at this time)`);
      
      // Schema requires these fields for scheduled_classes table
      const classData = {
        timetable_id: timetable.id,
        batch_id: finalBatchId, // REQUIRED by schema
        subject_id: assignment.subject.id, // Validated UUID
        faculty_id: assignment.faculty.id, // Validated UUID
        classroom_id: assignedClassroomId, // REQUIRED by schema - now always has a value
        time_slot_id: dbTimeSlotId, // Use mapped database UUID
        credit_hour_number: scheduledClasses.length + 1, // Sequential based on valid assignments
        class_type: isLabAssignment ? 'LAB' : (assignment.subject.subjectType || 'THEORY'),
        session_duration: (assignment.duration || 1) * 60, // Duration in minutes
        is_recurring: true,
        is_lab: isLabAssignment, // Mark if this is a lab class
        is_continuation: false, // This is the main slot, not continuation
        session_number: assignment.session_number || 1, // Session number for tracking
        notes: `${assignment.subject.name} - ${assignment.faculty.firstName} ${assignment.faculty.lastName}`
      };
      
      if (index === 0) {
        console.log('✅ Sample class data (first assignment):', {
          ...classData,
          mapped_time_slot: timeSlotKey,
          is_lab: isLabAssignment
        });
      }
      
      scheduledClasses.push(classData);
      
      // If this is a lab (2-hour session), create a continuation entry for the next slot
      if (isLabAssignment && assignment.duration === 2 && assignment.endSlotIndex !== undefined) {
        // Find the next time slot for continuation
        const nextSlotTime = assignment.timeSlot.time.split('-')[1]; // Get end time of current slot
        const continuationKey = `${assignment.timeSlot.day}-${normalizeTime(nextSlotTime)}`;
        const continuationTimeSlotId = timeSlotMap.get(continuationKey);
        
        if (continuationTimeSlotId) {
          console.log(`✅ Creating continuation slot for lab: ${continuationKey}`);
          
          const continuationData = {
            timetable_id: timetable.id,
            batch_id: finalBatchId,
            subject_id: assignment.subject.id,
            faculty_id: assignment.faculty.id,
            classroom_id: assignedClassroomId,
            time_slot_id: continuationTimeSlotId,
            credit_hour_number: scheduledClasses.length + 1,
            class_type: 'LAB',
            session_duration: 60, // Second hour
            is_recurring: true,
            is_lab: true,
            is_continuation: true, // Mark as continuation
            session_number: assignment.session_number || 1,
            notes: `${assignment.subject.name} - ${assignment.faculty.firstName} ${assignment.faculty.lastName} (Lab Continuation)`
          };
          
          scheduledClasses.push(continuationData);
          console.log(`✅ Added lab continuation slot for ${assignment.subject.name}`);
        } else {
          console.warn(`⚠️ Could not find continuation time slot for ${continuationKey}`);
        }
      }
    }

    if (scheduledClasses.length === 0) {
      console.error('❌ No valid scheduled classes after time slot mapping');
      // Rollback
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      
      return NextResponse.json({
        error: 'No valid time slots could be matched. Please check your assignments.',
        success: false
      }, { status: 400 });
    }

    console.log(`✅ Mapped ${scheduledClasses.length} out of ${assignments.length} assignments to database time slots`);

    // STEP 3.9: Validate constraints BEFORE saving to database
    console.log('🔍 Validating constraint rules...');
    try {
      // Fetch active constraint rules
      const constraintRules = await fetchConstraintRules({
        department_id: finalDepartmentId,
        batch_id: finalBatchId
      });
      
      console.log(`✅ Loaded ${constraintRules.length} constraint rules for validation`);
      
      // Prepare time slots data for validation
      const timeSlotData: TimeSlot[] = dbTimeSlots.map(ts => ({
        id: ts.id,
        day: ts.day,
        start_time: ts.start_time,
        end_time: ts.end_time,
        duration_minutes: ts.duration_minutes
      }));
      
      // Validate scheduled classes against constraints
      const { violations, score } = await validateConstraints(
        scheduledClasses as ScheduledClass[],
        timeSlotData,
        constraintRules
      );
      
      console.log(`✅ Constraint validation complete:`);
      console.log(`   - Violations: ${violations.length}`);
      console.log(`   - Fitness Score: ${score.toFixed(2)}%`);
      
      // Update timetable with constraint violations and recalculated score
      if (violations.length > 0) {
        console.log('⚠️ Constraint violations detected:');
        violations.forEach((v, idx) => {
          console.log(`   ${idx + 1}. [${v.severity}] ${v.description} (Rule: ${v.rule_name})`);
        });
        
        // Update timetable fitness score and violations
        await supabase
          .from('generated_timetables')
          .update({
            fitness_score: score,
            constraint_violations: violations
          })
          .eq('id', timetable.id);
        
        // Create notifications for creator and publishers about violations
        console.log('📧 Creating constraint violation notifications...');
        const notificationResult = await createConstraintViolationNotifications({
          timetableId: timetable.id,
          batchId: finalBatchId,
          violations: violations,
          creatorId: createdBy,
          departmentId: finalDepartmentId,
          timetableTitle: title || `Manual Timetable - ${academicYear}`
        });
        
        if (notificationResult.success) {
          console.log('✅ Constraint violation notifications created successfully');
        } else {
          console.error('⚠️ Failed to create notifications:', notificationResult.error);
        }
      }
      
      // Check for CRITICAL violations (HARD constraints)
      const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
      if (criticalViolations.length > 0) {
        console.error(`❌ ${criticalViolations.length} CRITICAL constraint violations found!`);
        console.error('   Timetable has HARD constraint violations that must be fixed.');
        
        // Still save but warn the user
        // In production, you might want to prevent saving or require acknowledgment
      }
      
    } catch (constraintError) {
      console.error('⚠️ Error during constraint validation:', constraintError);
      // Don't fail the entire save operation, just log the error
    }

    const { data: classes, error: classesError } = await supabase
      .from('scheduled_classes')
      .insert(scheduledClasses)
      .select();

    if (classesError) {
      console.error('❌ Error creating scheduled classes:', classesError);
      console.error('Error details:', JSON.stringify(classesError, null, 2));
      
      // Rollback: Delete timetable and task
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      
      return NextResponse.json(
        { 
          error: 'Failed to create scheduled classes',
          success: false,
          details: classesError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ Successfully created', classes?.length || 0, 'scheduled classes');

    // STEP 4: Create initial workflow approval record
    const { error: workflowError } = await supabase
      .from('workflow_approvals')
      .insert({
        timetable_id: timetable.id,
        workflow_step: 'created',
        performed_by: createdBy,
        comments: 'Manual timetable created',
        approval_level: 'creator'
      });

    if (workflowError) {
      console.error('⚠️ Warning: Failed to create workflow record:', workflowError);
      // Don't fail the whole operation for this
    }

    return NextResponse.json({
      success: true,
      timetable: {
        id: timetable.id,
        title: timetable.title,
        status: timetable.status,
        batch_id: timetable.batch_id,
        task_id: task.id
      },
      message: 'Timetable saved successfully',
      classes_created: classes?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error saving timetable:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const semester = searchParams.get('semester');
    const status = searchParams.get('status');
    const academicYear = searchParams.get('academicYear');

    let query = supabase
      .from('generated_timetables')
      .select(`
        *,
        batch:batches(id, name, semester, section, department_id),
        created_by_user:users!created_by(first_name, last_name, email),
        generation_task:timetable_generation_tasks(task_name, status, progress)
      `)
      .order('created_at', { ascending: false });

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    if (semester) {
      query = query.eq('semester', parseInt(semester));
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data: timetables, error } = await query;

    if (error) {
      console.error('Error fetching timetables:', error);
      return NextResponse.json(
        { error: 'Failed to fetch timetables', success: false },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timetables: timetables || []
    });

  } catch (error) {
    console.error('Unexpected error fetching timetables:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}