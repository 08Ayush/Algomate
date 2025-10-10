import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Save AI Generated Timetable
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
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

    console.log('💾 Saving AI Generated Timetable:', { title, semester, batch_id, created_by });

    // Validate required fields
    if (!batch_id || !semester || !academic_year || !created_by || !schedule || schedule.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        details: {
          batch_id: !!batch_id,
          semester: !!semester,
          academic_year: !!academic_year,
          created_by: !!created_by,
          schedule: schedule?.length || 0
        }
      }, { status: 400 });
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
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from('time_slots')
      .select('*')
      .eq('college_id', college_id);

    if (timeSlotsError) {
      console.error('⚠️ Error fetching time slots:', timeSlotsError);
    }

    // Create a map of day-time to time_slot_id
    const timeSlotMap = new Map();
    timeSlots?.forEach(slot => {
      const key = `${slot.day}-${slot.start_time}`;
      timeSlotMap.set(key, slot.id);
    });

    console.log(`📍 Mapped ${timeSlotMap.size} time slots`);

    // STEP 4: Insert scheduled classes (schema-aligned)
    console.log('📝 Creating', schedule.length, 'scheduled classes...');
    const scheduledClasses = schedule.map((item: any, index: number) => {
      // Find matching time slot
      const timeKey = `${item.day}-${item.time.split('-')[0]}`;
      const timeSlotId = timeSlotMap.get(timeKey) || null;

      if (!timeSlotId) {
        console.warn(`⚠️ No time_slot_id found for ${timeKey}`);
      }

      // Schema-aligned structure
      return {
        timetable_id: timetable.id,
        batch_id: batch_id,                  // REQUIRED
        subject_id: item.subject_id,
        faculty_id: item.faculty_id,
        classroom_id: item.classroom_id || null,  // Can be null but must be valid if provided
        time_slot_id: timeSlotId,           // REQUIRED FK
        credit_hour_number: index + 1,      // REQUIRED sequential
        class_type: item.subject_type || 'THEORY',
        session_duration: (item.duration || 1) * 60,  // in minutes
        is_recurring: true,
        notes: `${item.subject_name || 'Class'} - ${item.faculty_name || 'Faculty'}`
      };
    });

    // Filter out any with null time_slot_id as it's required
    const validClasses = scheduledClasses.filter((c: any) => c.time_slot_id !== null);
    
    if (validClasses.length < scheduledClasses.length) {
      console.warn(`⚠️ Filtered out ${scheduledClasses.length - validClasses.length} classes with invalid time slots`);
    }

    const { data: classes, error: classesError } = await supabase
      .from('scheduled_classes')
      .insert(validClasses)
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
