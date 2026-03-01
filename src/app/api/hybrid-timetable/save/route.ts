import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  fetchConstraintRules,
  validateConstraints,
  calculateFitnessScore,
  type ScheduledClass,
  type TimeSlot
} from '@/lib/constraintRules';
import { createConstraintViolationNotifications } from '@/lib/notifications';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Save Hybrid Generated Timetable
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    let {
      semester,
      department_id,
      college_id,
      batch_id,
      academic_year,
      schedule,
      created_by,
      status = 'draft', // draft or pending_approval
      statistics,
      metrics,
      enabled_constraint_ids // IDs of constraints enabled in UI
    } = body;

    console.log('💾 Saving Hybrid Generated Timetable:', {
      semester,
      batch_id,
      status,
      schedule_count: schedule?.length,
      enabled_constraints: enabled_constraint_ids?.length || 'all'
    });

    // NOTE: With timetable-specific constraints, multiple drafts can coexist
    // No need to delete existing drafts - each timetable is isolated
    console.log('✅ Using timetable-specific constraints - multiple drafts supported');

    // Validate essential fields
    if (!semester || !academic_year || !created_by || !schedule || schedule.length === 0) {
      console.error('❌ Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Get college_id if not provided
    if (!college_id || !batch_id) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('department_id, college_id')
        .eq('id', created_by)
        .single();

      if (!userError && userData) {
        department_id = department_id || userData.department_id;
        college_id = college_id || userData.college_id;
      }
    }

    // Find or create batch
    if (!batch_id && department_id && college_id) {
      const { data: existingBatch, error: batchError } = await supabase
        .from('batches')
        .select('id')
        .eq('department_id', department_id)
        .eq('semester', semester)
        .eq('academic_year', academic_year)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!batchError && existingBatch) {
        batch_id = existingBatch.id;
      } else {
        const { data: newBatch, error: createBatchError } = await supabase
          .from('batches')
          .insert({
            name: `Semester ${semester} - ${academic_year}`,
            department_id: department_id,
            college_id: college_id,
            semester: semester,
            academic_year: academic_year,
            section: 'A',
            expected_strength: 60,
            actual_strength: 60,
            is_active: true
          })
          .select('id')
          .single();

        if (!createBatchError && newBatch) {
          batch_id = newBatch.id;
        }
      }
    }

    if (!batch_id) {
      return NextResponse.json({
        success: false,
        error: 'Could not determine batch_id'
      }, { status: 400 });
    }

    // Create generation task
    const taskData = {
      task_name: `Hybrid Timetable - Semester ${semester}`,
      batch_id: batch_id,
      academic_year: academic_year,
      semester: semester,
      status: 'COMPLETED',
      current_phase: 'COMPLETED',
      progress: 100,
      current_message: 'Hybrid algorithm completed successfully',
      created_by: created_by,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      solutions_generated: 1,
      best_fitness_score: parseFloat(statistics?.completionRate || '100'),
      execution_time_seconds: Math.round(parseFloat(metrics?.execution_time || '10')),
    };

    const { data: task, error: taskError } = await supabase
      .from('timetable_generation_tasks')
      .insert(taskData)
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating task:', taskError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create generation task',
        details: taskError.message
      }, { status: 500 });
    }

    // Create timetable record
    const title = `Hybrid Timetable - Semester ${semester} - ${academic_year}`;

    const timetableData = {
      generation_task_id: task.id,
      title: title,
      batch_id: batch_id,
      college_id: college_id, // REQUIRED by schema
      academic_year: academic_year,
      semester: semester,
      fitness_score: parseFloat(statistics?.completionRate || '100'),
      generation_method: 'HYBRID',
      status: status,
      created_by: created_by,
      version: 1
    };

    const { data: timetable, error: timetableError } = await supabase
      .from('generated_timetables')
      .insert(timetableData)
      .select()
      .single();

    if (timetableError) {
      console.error('❌ Error creating timetable:', timetableError);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      return NextResponse.json({
        success: false,
        error: 'Failed to create timetable',
        details: timetableError.message
      }, { status: 500 });
    }

    console.log('✅ Created timetable record:', timetable.id);

    // Get time slot mappings
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('college_id', college_id)
      .eq('is_active', true);

    if (timeSlotsError) {
      console.error('⚠️ Error fetching time slots:', timeSlotsError);
    }

    // Create time slot mapping
    const timeSlotMap = new Map();
    timeSlots?.forEach(slot => {
      const startTime = slot.start_time.substring(0, 5);
      const key = `${slot.day}-${startTime}`;
      timeSlotMap.set(key, slot.id);
    });

    console.log(`📍 Created time slot mapping with ${timeSlotMap.size} entries`);
    console.log('Sample time slot keys:', Array.from(timeSlotMap.keys()).slice(0, 5));

    // Log sample schedule items to check time format
    console.log('Sample schedule items:', schedule.slice(0, 3).map((item: any) => ({
      day: item.day,
      time: item.time,
      timeKey: `${item.day}-${item.time}`,
      subject: item.subject_name
    })));

    // Get all available classrooms for dynamic assignment - FILTER BY DEPARTMENT
    let { data: availableClassrooms, error: classroomError } = await supabase
      .from('classrooms')
      .select('id, name, capacity, type')
      .eq('college_id', college_id)
      .eq('department_id', department_id)  // Only get classrooms for this department!
      .eq('is_available', true);

    console.log(`🏫 Classrooms query result:`, {
      college_id,
      department_id,
      found: availableClassrooms?.length || 0,
      error: classroomError?.message
    });

    if (classroomError) {
      console.error('❌ Error fetching classrooms:', classroomError);
    }

    // If no classrooms found, try without college_id filter or create default ones
    if (!availableClassrooms || availableClassrooms.length === 0) {
      console.warn('⚠️ No classrooms found with college_id filter, trying without filter...');

      const { data: allClassrooms } = await supabase
        .from('classrooms')
        .select('id, name, capacity, type')
        .eq('is_available', true)
        .limit(10);

      if (allClassrooms && allClassrooms.length > 0) {
        console.log(`✅ Found ${allClassrooms.length} classrooms without college filter`);
        availableClassrooms = allClassrooms;
      } else {
        // Create a default classroom
        console.log('📝 Creating default classroom for college...');
        const { data: newClassroom, error: createError } = await supabase
          .from('classrooms')
          .insert({
            college_id: college_id,
            name: 'Default Classroom',
            capacity: 60,
            type: 'Lecture Hall',
            is_available: true
          })
          .select('id, name, capacity, type')
          .single();

        if (createError) {
          console.error('❌ Failed to create default classroom:', createError);
          await supabase.from('generated_timetables').delete().eq('id', timetable.id);
          await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
          return NextResponse.json({
            success: false,
            error: 'No classrooms available and failed to create default classroom',
            details: createError.message
          }, { status: 500 });
        }

        availableClassrooms = [newClassroom];
        console.log('✅ Created default classroom:', newClassroom.id);
      }
    }

    console.log(`🏫 Found ${availableClassrooms.length} available classrooms`);

    // Create a classroom assignment tracker to avoid conflicts
    // Map: "time_slot_id" -> Set of used classroom_ids
    const classroomUsageMap = new Map<string, Set<string>>();

    // NOTE: With timetable-specific constraints, we don't need to check other timetables
    // The database constraints ensure no conflicts within THIS timetable
    console.log('📍 Using timetable-specific constraints - conflicts auto-prevented by database');

    // Log schedule to check for duplicates BEFORE processing
    console.log(`📋 Raw schedule analysis:`);
    const scheduleDayTime = schedule.map((item: any) => `${item.day}-${item.time}`);
    const uniqueDayTimes = new Set(scheduleDayTime);
    console.log(`  - Total schedule items: ${schedule.length}`);
    console.log(`  - Unique day-time combinations: ${uniqueDayTimes.size}`);
    console.log(`  - Continuation entries: ${schedule.filter((item: any) => item.is_continuation).length}`);

    if (schedule.length !== uniqueDayTimes.size) {
      console.warn(`⚠️ Schedule has ${schedule.length - uniqueDayTimes.size} duplicate day-time combinations!`);

      // Find and log duplicates
      const dayTimeCount = new Map<string, number>();
      scheduleDayTime.forEach((dt: string) => {
        dayTimeCount.set(dt, (dayTimeCount.get(dt) || 0) + 1);
      });

      const duplicates = Array.from(dayTimeCount.entries())
        .filter(([_, count]) => count > 1)
        .slice(0, 5);

      console.warn('Sample duplicates:', duplicates);
    }

    // DEDUPLICATE schedule array BEFORE processing
    // Remove duplicate day-time combinations, keeping only the first occurrence
    // IMPORTANT: Keep continuation classes as they are separate time slots
    const seenScheduleSlots = new Set<string>();
    const deduplicatedSchedule = schedule.filter((item: any) => {
      // KEEP continuation classes - they need to be saved too!
      if (item.is_continuation) return true;

      const slotKey = `${item.day}-${item.time}`;
      if (seenScheduleSlots.has(slotKey)) {
        console.warn(`⚠️ Removing duplicate schedule entry: ${slotKey} - ${item.subject_name}`);
        return false;
      }

      seenScheduleSlots.add(slotKey);
      return true;
    });

    console.log(`🔄 Deduplicated schedule: ${schedule.length} -> ${deduplicatedSchedule.length} entries`);

    // Insert scheduled classes using the deduplicated schedule
    const scheduledClasses = deduplicatedSchedule.map((item: any, index: number) => {
      const timeKey = `${item.day}-${item.time}`;
      const timeSlotId = timeSlotMap.get(timeKey);

      if (!timeSlotId) {
        console.error(`❌ No time_slot_id found for ${timeKey}`);
      }

      // Assign classroom - USE the one from generator if provided, otherwise assign one
      let assignedClassroomId = null;

      // PRIORITY 1: Use classroom already assigned by generator (it handles occupancy correctly)
      if (item.classroom_id) {
        assignedClassroomId = item.classroom_id;
        console.log(`🏫 Using generator-assigned classroom ${assignedClassroomId.substring(0, 8)} for ${timeKey}`);
      }
      // PRIORITY 2: Assign classroom if generator didn't provide one
      else if (timeSlotId) {
        // Get classrooms already used in this time slot
        const usedClassrooms = classroomUsageMap.get(timeSlotId) || new Set();

        // Find first available classroom not used in this time slot
        const availableClassroom = availableClassrooms.find(
          classroom => !usedClassrooms.has(classroom.id)
        );

        if (availableClassroom) {
          assignedClassroomId = availableClassroom.id;
          usedClassrooms.add(availableClassroom.id);
          classroomUsageMap.set(timeSlotId, usedClassrooms);
          console.log(`🏫 Auto-assigned ${availableClassroom.id.substring(0, 8)} to ${timeKey}`);
        } else {
          // All classrooms are in use, cycle through them
          const classroomIndex = index % availableClassrooms.length;
          assignedClassroomId = availableClassrooms[classroomIndex].id;
          console.warn(`⚠️ All classrooms in use for ${timeKey}, cycling to classroom ${classroomIndex + 1}`);
        }
      } else {
        // Fallback to cycling if no time slot found
        const classroomIndex = index % availableClassrooms.length;
        assignedClassroomId = availableClassrooms[classroomIndex].id;
        console.warn(`⚠️ No time slot found for ${timeKey}, using fallback classroom`);
      }

      return {
        timetable_id: timetable.id,
        batch_id: batch_id,
        subject_id: item.subject_id,
        faculty_id: item.faculty_id,
        classroom_id: assignedClassroomId,
        time_slot_id: timeSlotId,
        credit_hour_number: index + 1,
        class_type: item.subject_type || 'THEORY',
        session_duration: (item.duration || 1) * 60,
        is_recurring: true,
        is_continuation: item.is_continuation || false,
        is_lab: item.is_lab || false,
        session_number: item.session_number || 1,
        notes: item.is_continuation
          ? `${item.subject_name || 'Class'} - ${item.faculty_name || 'Faculty'} (Continuation)`
          : item.duration === 2
            ? `${item.subject_name || 'Class'} - ${item.faculty_name || 'Faculty'} (2-hour session)`
            : `${item.subject_name || 'Class'} - ${item.faculty_name || 'Faculty'}`
      };
    });

    console.log(`📝 Generated ${scheduledClasses.length} scheduled classes from deduplicated schedule`);

    // Log first few classes to debug
    console.log('First 5 scheduled classes:', scheduledClasses.slice(0, 5).map((c: any) => ({
      subject_id: c.subject_id?.substring(0, 8),
      time_slot_id: c.time_slot_id?.substring(0, 8),
      classroom_id: c.classroom_id?.substring(0, 8)
    })));

    // Filter out invalid entries - check all required fields
    const validClasses = scheduledClasses.filter((c: any) => {
      const isValid = c.time_slot_id !== null &&
        c.time_slot_id !== undefined &&
        c.classroom_id !== null &&
        c.faculty_id !== null &&
        c.subject_id !== null;

      if (!isValid) {
        console.error('❌ Invalid class entry:', {
          time_slot_id: c.time_slot_id,
          classroom_id: c.classroom_id,
          faculty_id: c.faculty_id,
          subject_id: c.subject_id
        });
      }

      return isValid;
    });

    if (validClasses.length < scheduledClasses.length) {
      console.warn(`⚠️ Filtered out ${scheduledClasses.length - validClasses.length} classes with invalid fields`);
    }

    if (validClasses.length === 0) {
      console.error('❌ No valid classes to insert');
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      return NextResponse.json({
        success: false,
        error: 'No valid classes to insert. Check time slot mappings and classroom assignments.'
      }, { status: 500 });
    }

    // MULTI-LEVEL DEDUPLICATION to satisfy all 3 database constraints

    // Pre-deduplication analysis
    console.log('🔍 Pre-deduplication analysis:');
    const batchTimeOccurrences = new Map<string, number>();
    validClasses.forEach((cls: any) => {
      const key = `${cls.batch_id}-${cls.time_slot_id}`;
      batchTimeOccurrences.set(key, (batchTimeOccurrences.get(key) || 0) + 1);
    });

    const duplicateBatchTimes = Array.from(batchTimeOccurrences.entries())
      .filter(([_, count]) => count > 1);

    if (duplicateBatchTimes.length > 0) {
      console.warn(`⚠️ Found ${duplicateBatchTimes.length} batch+time combinations with duplicates:`);
      duplicateBatchTimes.slice(0, 5).forEach(([key, count]) => {
        console.warn(`  - ${key}: ${count} occurrences`);
      });
    }

    // Level 1: Remove batch + time_slot duplicates (prevents no_batch_time_conflict)
    const seenBatchTime = new Set<string>();
    const noBatchConflicts = validClasses.filter((cls: any) => {
      const key = `${cls.batch_id}-${cls.time_slot_id}`;
      if (seenBatchTime.has(key)) {
        console.warn(`⚠️ Level 1: Removing batch+time duplicate: ${key.substring(0, 40)}...`);
        return false;
      }
      seenBatchTime.add(key);
      return true;
    });

    // Level 2: Remove classroom + time_slot duplicates (prevents no_classroom_time_conflict)
    const seenClassroomTime = new Set<string>();
    const noClassroomConflicts = noBatchConflicts.filter((cls: any) => {
      const key = `${cls.classroom_id}-${cls.time_slot_id}`;
      if (seenClassroomTime.has(key)) {
        console.warn(`⚠️ Level 2: Removing classroom+time duplicate: ${key}`);
        return false;
      }
      seenClassroomTime.add(key);
      return true;
    });

    // Level 3: Remove faculty + time_slot duplicates (prevents no_faculty_time_conflict)
    const seenFacultyTime = new Set<string>();
    const finalUniqueClasses = noClassroomConflicts.filter((cls: any) => {
      const key = `${cls.faculty_id}-${cls.time_slot_id}`;
      if (seenFacultyTime.has(key)) {
        console.warn(`⚠️ Level 3: Removing faculty+time duplicate: ${key}`);
        return false;
      }
      seenFacultyTime.add(key);
      return true;
    });

    console.log(`📊 Multi-level deduplication results:
      Original: ${schedule.length}
      After filter: ${scheduledClasses.length}
      Valid: ${validClasses.length}
      After batch dedup: ${noBatchConflicts.length}
      After classroom dedup: ${noClassroomConflicts.length}
      Final: ${finalUniqueClasses.length}`);

    // Log deduplication summary
    const totalRemoved = validClasses.length - finalUniqueClasses.length;
    if (totalRemoved > 0) {
      console.warn(`🔄 Total duplicates removed: ${totalRemoved}`);
      console.warn(`  - Batch conflicts: ${validClasses.length - noBatchConflicts.length}`);
      console.warn(`  - Classroom conflicts: ${noBatchConflicts.length - noClassroomConflicts.length}`);
      console.warn(`  - Faculty conflicts: ${noClassroomConflicts.length - finalUniqueClasses.length}`);
    }

    if (finalUniqueClasses.length === 0) {
      console.error('❌ No valid classes to insert after multi-level deduplication');
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      return NextResponse.json({
        success: false,
        error: 'No valid classes to schedule after conflict resolution'
      }, { status: 400 });
    }

    // Validate constraints BEFORE inserting
    console.log('🔍 Validating constraint rules for hybrid timetable...');
    try {
      const constraintRules = await fetchConstraintRules({
        department_id: department_id,
        batch_id: batch_id,
        enabled_constraint_ids: enabled_constraint_ids
      });

      console.log(`✅ Loaded ${constraintRules.length} constraint rules for validation${enabled_constraint_ids ? ' (filtered by UI selection)' : ''}`);

      // Prepare time slots data
      const timeSlotData: TimeSlot[] = (timeSlots || []).map(ts => ({
        id: ts.id,
        day: ts.day,
        start_time: ts.start_time,
        end_time: ts.end_time,
        duration_minutes: ts.duration_minutes
      }));

      // Validate
      const { violations, score } = await validateConstraints(
        finalUniqueClasses as ScheduledClass[],
        timeSlotData,
        constraintRules
      );

      console.log(`✅ Hybrid timetable constraint validation:`);
      console.log(`   - Violations: ${violations.length}`);
      console.log(`   - Fitness Score: ${score.toFixed(2)}%`);

      // Update timetable with validation results
      if (violations.length > 0) {
        console.log('⚠️ Constraint violations detected:');
        violations.forEach((v, idx) => {
          console.log(`   ${idx + 1}. [${v.severity}] ${v.description}`);
        });

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
          batchId: batch_id,
          violations: violations,
          creatorId: created_by,
          departmentId: department_id,
          timetableTitle: timetable.title || `Hybrid Timetable - Semester ${semester}`
        });

        if (notificationResult.success) {
          console.log('✅ Constraint violation notifications created successfully');
        } else {
          console.error('⚠️ Failed to create notifications:', notificationResult.error);
        }
      }

      const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
      if (criticalViolations.length > 0) {
        console.error(`❌ ${criticalViolations.length} CRITICAL violations in hybrid timetable!`);
      }

    } catch (constraintError) {
      console.error('⚠️ Error during constraint validation:', constraintError);
    }

    // Insert classes using the fully deduplicated array
    const { data: insertedClasses, error: classesError } = await supabase
      .from('scheduled_classes')
      .insert(finalUniqueClasses)
      .select();

    if (classesError) {
      console.error('❌ Error inserting classes:', classesError);
      console.error('Failed classes sample:', finalUniqueClasses.slice(0, 3));

      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);

      // Check if it's a constraint violation
      const errorMessage = classesError.message || '';
      let userMessage = 'Failed to insert scheduled classes';

      if (errorMessage.includes('no_batch_time_conflict')) {
        userMessage = 'Scheduling conflict: Same batch scheduled in multiple classes at the same time';
      } else if (errorMessage.includes('no_faculty_time_conflict')) {
        userMessage = 'Scheduling conflict: Faculty assigned to multiple classes at the same time';
      } else if (errorMessage.includes('no_classroom_time_conflict')) {
        userMessage = 'Scheduling conflict: Classroom assigned to multiple classes at the same time';
      } else if (errorMessage.includes('null value')) {
        userMessage = 'Missing required data: classroom, time slot, faculty, or subject information';
      }

      return NextResponse.json({
        success: false,
        error: userMessage,
        details: classesError.message,
        code: classesError.code
      }, { status: 500 });
    }

    console.log(`✅ Inserted ${insertedClasses?.length || 0} scheduled classes`);

    // If sending to publisher, create workflow approval entry
    if (status === 'pending_approval') {
      const { error: workflowError } = await supabase
        .from('workflow_approvals')
        .insert({
          timetable_id: timetable.id,
          workflow_step: 'submitted_for_review',
          performed_by: created_by,
          comments: 'Hybrid timetable submitted for publisher review',
          approval_level: 'publisher'
        });

      if (workflowError) {
        console.error('⚠️ Error creating workflow approval:', workflowError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        timetable_id: timetable.id,
        task_id: task.id,
        status: status,
        classes_saved: insertedClasses?.length || 0
      },
      message: status === 'pending_approval'
        ? 'Timetable sent to publisher for review'
        : 'Timetable saved as draft'
    });

  } catch (error: any) {
    console.error('❌ Save error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to save hybrid timetable'
    }, { status: 500 });
  }
}
