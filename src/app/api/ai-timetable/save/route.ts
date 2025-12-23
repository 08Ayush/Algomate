import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Save AI Generated Timetable
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { 
      title,
      semester, 
      department_id,
      college_id,
      batch_id,
      academic_year, 
      schedule,
      created_by,
      status = 'draft' // draft, pending_approval, published
    } = body;

    console.log('💾 Saving AI Generated Timetable:', { title, semester, batch_id, department_id, college_id, created_by, schedule_count: schedule?.length });

    // Validate essential fields first
    if (!semester || !academic_year || !created_by || !schedule || schedule.length === 0) {
      console.error('❌ Missing required fields:', {
        semester: !!semester,
        academic_year: !!academic_year,
        created_by: !!created_by,
        schedule: schedule?.length || 0
      });
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        details: {
          semester: !!semester,
          academic_year: !!academic_year,
          created_by: !!created_by,
          schedule: schedule?.length || 0
        }
      }, { status: 400 });
    }

    // If batch_id not provided, try to find or create one
    if (!batch_id) {
      console.log('🔍 No batch_id provided, searching for batch...');
      
      // Get user details to find department_id if not provided
      if (!department_id || !college_id) {
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

      if (department_id && college_id) {
        // Try to find existing batch for this semester
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
          console.log('✅ Found existing batch:', batch_id);
        } else {
          // Create a new batch
          console.log('📝 Creating new batch for semester', semester);
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
            console.log('✅ Created new batch:', batch_id);
          } else {
            console.error('❌ Failed to create batch:', createBatchError);
          }
        }
      }
    }

    // Final validation - batch_id is required
    if (!batch_id) {
      return NextResponse.json({
        success: false,
        error: 'Could not determine batch. Please provide batch_id or ensure department and college are set.',
        details: {
          department_id: !!department_id,
          college_id: !!college_id,
          semester: semester
        }
      }, { status: 400 });
    }

    console.log('✅ Using batch_id:', batch_id);

    // STEP 0.5: Check for existing draft timetables for this batch and clean them up
    console.log('🔍 Checking for existing draft timetables for batch...');
    const { data: existingDrafts, error: draftsError } = await supabase
      .from('generated_timetables')
      .select('id')
      .eq('batch_id', batch_id)
      .eq('status', 'draft')
      .eq('semester', semester)
      .eq('academic_year', academic_year);

    if (!draftsError && existingDrafts && existingDrafts.length > 0) {
      console.log(`🗑️ Found ${existingDrafts.length} existing draft(s), deleting...`);
      for (const draft of existingDrafts) {
        // Delete scheduled classes first (will cascade delete from timetable deletion anyway)
        await supabase.from('scheduled_classes').delete().eq('timetable_id', draft.id);
        // Delete the timetable (this will also delete the task via CASCADE)
        await supabase.from('generated_timetables').delete().eq('id', draft.id);
      }
      console.log('✅ Cleaned up existing drafts');
    }

    // STEP 1: Create generation task (REQUIRED by schema)
    console.log('📝 Creating generation task...');
    const { data: task, error: taskError } = await supabase
      .from('timetable_generation_tasks')
      .insert({
        task_name: title || `AI Timetable - Semester ${semester}`,
        batch_id: batch_id,
        academic_year: academic_year,
        semester: semester,
        status: 'COMPLETED',
        current_phase: 'COMPLETED',
        progress: 100,
        current_message: 'AI timetable generation completed',
        algorithm_config: {
          method: 'ai_generation',
          created_at: new Date().toISOString()
        },
        created_by: created_by,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        solutions_generated: 1,
        best_fitness_score: 0.85,
        execution_time_seconds: 5
      })
      .select()
      .single();

    if (taskError) {
      console.error('❌ Error creating generation task:', taskError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create generation task',
        details: taskError.message
      }, { status: 500 });
    }

    console.log('✅ Created generation task:', task.id);

    // STEP 2: Create timetable record (schema-aligned)
    const timetableData = {
      generation_task_id: task.id,  // REQUIRED FK
      title: title || `Semester ${semester} Timetable - ${academic_year}`,
      batch_id: batch_id,            // REQUIRED FK
      academic_year: academic_year,
      semester: semester,
      status: status,
      fitness_score: 0.85,
      constraint_violations: [],
      optimization_metrics: {
        method: 'ai_generation',
        total_assignments: schedule.length,
        created_at: new Date().toISOString()
      },
      generation_method: 'HYBRID',
      created_by: created_by,
      version: 1
    };

    console.log('💾 Creating timetable record...');
    const { data: timetable, error: timetableError } = await supabase
      .from('generated_timetables')
      .insert(timetableData)
      .select()
      .single();

    if (timetableError) {
      console.error('❌ Error creating timetable:', timetableError);
      // Cleanup task
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create timetable',
        details: timetableError.message
      }, { status: 500 });
    }

    console.log('✅ Created timetable record:', timetable.id);

    // STEP 3: Get time slot mappings
    console.log('📍 Fetching time slots from database for college:', college_id);
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('college_id', college_id)
      .eq('is_active', true);

    if (timeSlotsError) {
      console.error('⚠️ Error fetching time slots:', timeSlotsError);
    }

    console.log(`📊 Found ${timeSlots?.length || 0} time slots in database`);
    if (timeSlots && timeSlots.length > 0) {
      console.log('📋 Sample time slots:', timeSlots.slice(0, 3).map(ts => ({
        day: ts.day,
        start_time: ts.start_time,
        end_time: ts.end_time
      })));
    }

    // Create a map of day-time to time_slot_id
    // Time slots in DB have format: start_time = "09:00:00", our schedule has "09:00"
    const timeSlotMap = new Map();
    timeSlots?.forEach(slot => {
      // Extract HH:MM from "HH:MM:SS" format
      const startTime = slot.start_time.substring(0, 5); // "09:00:00" -> "09:00"
      const key = `${slot.day}-${startTime}`;
      timeSlotMap.set(key, slot.id);
      console.log(`🔗 Mapped: ${key} -> ${slot.id}`);
    });

    console.log(`📍 Created time slot mapping with ${timeSlotMap.size} entries`);
    console.log('📋 Sample mapping keys:', Array.from(timeSlotMap.keys()).slice(0, 5));

    // STEP 4: Insert scheduled classes (schema-aligned)
    console.log('📝 Creating', schedule.length, 'scheduled classes...');
    console.log('📋 Sample schedule item:', schedule[0]);
    
    // Track unique times used in schedule
    const uniqueTimes = new Set(schedule.map((item: any) => item.time));
    console.log('⏰ Unique times in schedule:', Array.from(uniqueTimes).sort());
    
    const scheduledClasses = schedule.map((item: any, index: number) => {
      // item.time is in format "09:00" from the AI generator
      const timeKey = `${item.day}-${item.time}`;
      const timeSlotId = timeSlotMap.get(timeKey);

      if (!timeSlotId) {
        console.error(`❌ No time_slot_id found for schedule item #${index}:`, {
          key: timeKey,
          subject: item.subject_name,
          is_continuation: item.is_continuation || false,
          available_keys_for_day: Array.from(timeSlotMap.keys()).filter(k => k.startsWith(item.day))
        });
      } else {
        // Only log every 6th item to reduce noise, but log all labs/continuations
        if (index % 6 === 0 || item.is_lab || item.is_continuation) {
          console.log(`✅ #${index} Matched "${timeKey}" -> ${timeSlotId} (${item.subject_name}${item.is_continuation ? ' CONT' : ''})`);
        }
      }

      // Detect if this is a lab
      const isLabClass = item.is_lab || 
                         item.subject_type?.toLowerCase().includes('lab') ||
                         (item.duration && item.duration > 1);

      // Schema-aligned structure
      return {
        timetable_id: timetable.id,
        batch_id: batch_id,
        subject_id: item.subject_id,
        faculty_id: item.faculty_id,
        classroom_id: item.classroom_id || null,
        time_slot_id: timeSlotId,
        credit_hour_number: index + 1,
        class_type: isLabClass ? 'LAB' : (item.subject_type || 'THEORY'),
        session_duration: (item.duration || 1) * 60,
        is_recurring: true,
        is_lab: isLabClass,
        is_continuation: item.is_continuation || false,
        session_number: item.session_number || 1,
        notes: item.is_continuation 
          ? `${item.subject_name || 'Class'} (Continuation) - ${item.faculty_name || 'Faculty'}`
          : `${item.subject_name || 'Class'} - ${item.faculty_name || 'Faculty'}${item.duration === 2 ? ' (2-hour session)' : ''}`
      };
    });

    // Filter out any with null time_slot_id as it's required
    const validClasses = scheduledClasses.filter((c: any) => c.time_slot_id !== null);
    
    if (validClasses.length < scheduledClasses.length) {
      console.warn(`⚠️ Filtered out ${scheduledClasses.length - validClasses.length} classes with invalid time slots`);
      console.warn('Invalid classes:', scheduledClasses.filter((c: any) => c.time_slot_id === null).map((c: any) => ({
        subject_id: c.subject_id,
        day: schedule.find((s: any) => s.subject_id === c.subject_id)?.day,
        time: schedule.find((s: any) => s.subject_id === c.subject_id)?.time
      })));
    }

    // STEP 4.5: Check for duplicates and remove them
    const uniqueClasses = validClasses.filter((cls: any, index: number, self: any[]) => {
      // Find first occurrence of this batch_id + time_slot_id combination
      const firstIndex = self.findIndex(c => 
        c.batch_id === cls.batch_id && 
        c.time_slot_id === cls.time_slot_id
      );
      
      // If this is a duplicate, log it
      if (firstIndex !== index) {
        const original = self[firstIndex];
        console.warn(`🔄 Duplicate found:`, {
          slot_id: cls.time_slot_id,
          subject_original: original.notes?.split(' - ')[0],
          subject_duplicate: cls.notes?.split(' - ')[0],
          time: schedule[index]?.day + ' ' + schedule[index]?.time
        });
      }
      
      return firstIndex === index;
    });

    if (uniqueClasses.length < validClasses.length) {
      console.warn(`⚠️ Removed ${validClasses.length - uniqueClasses.length} duplicate classes (same batch + time slot)`);
    }

    console.log(`📊 Class counts: Generated=${schedule.length}, Valid=${validClasses.length}, Unique=${uniqueClasses.length}`);

    if (validClasses.length === 0) {
      console.error('❌ No valid classes to insert! All classes have invalid time slots.');
      console.error('Sample schedule items:', schedule.slice(0, 3));
      console.error('Available time slot keys:', Array.from(timeSlotMap.keys()).slice(0, 10));
      
      // Cleanup
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      
      return NextResponse.json({
        success: false,
        error: 'No valid classes to schedule - time slot mapping failed',
        details: 'Time slots in schedule do not match database time slots'
      }, { status: 400 });
    }

    console.log(`📝 Inserting ${uniqueClasses.length} valid classes...`);

    const { data: classes, error: classesError } = await supabase
      .from('scheduled_classes')
      .insert(uniqueClasses)
      .select();

    if (classesError) {
      console.error('❌ Error creating scheduled classes:', classesError);
      console.error('Error details:', JSON.stringify(classesError, null, 2));
      
      // Cleanup
      await supabase.from('generated_timetables').delete().eq('id', timetable.id);
      await supabase.from('timetable_generation_tasks').delete().eq('id', task.id);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to create scheduled classes',
        details: classesError.message
      }, { status: 500 });
    }

    console.log(`✅ Created ${classes?.length || 0} scheduled classes`);

    // STEP 5: Create workflow approval record
    const { error: workflowError } = await supabase
      .from('workflow_approvals')
      .insert({
        timetable_id: timetable.id,
        workflow_step: 'created',
        performed_by: created_by,
        comments: 'AI-generated timetable created',
        approval_level: 'creator'
      });

    if (workflowError) {
      console.error('⚠️ Warning: Failed to create workflow record:', workflowError);
    } else {
      console.log('✅ Workflow approval record created');
    }

    return NextResponse.json({
      success: true,
      data: {
        timetable_id: timetable.id,
        title: timetable.title,
        status: timetable.status,
        batch_id: timetable.batch_id,
        task_id: task.id,
        classes_created: classes?.length || 0,
        message: 'Timetable saved successfully'
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

// Publish timetable for approval
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { timetable_id, action } = body; // action: 'publish' or 'submit_for_approval'

    console.log('📤 Publishing timetable:', timetable_id, action);

    const newStatus = action === 'publish' ? 'published' : 'pending_approval';

    const { data, error } = await supabase
      .from('generated_timetables')
      .update({ 
        status: newStatus,
        published_at: action === 'publish' ? new Date().toISOString() : null
      })
      .eq('id', timetable_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating timetable:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update timetable status',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        timetable_id: data.id,
        status: data.status,
        message: `Timetable ${action === 'publish' ? 'published' : 'submitted for approval'} successfully`
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
