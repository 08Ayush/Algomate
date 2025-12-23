import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get authenticated user from token
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);
    
    // Verify user exists and is active
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, department_id, college_id, role, faculty_type, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Only creators can submit timetables
    if (user.faculty_type !== 'creator') {
      return NextResponse.json(
        { success: false, error: 'Only creators can submit timetables for review.' },
        { status: 403 }
      );
    }

    const timetableId = params.id;

    console.log('📤 Submitting timetable for review:', timetableId);
    console.log('👤 Creator user details:', { id: user.id, department_id: user.department_id, faculty_type: user.faculty_type });

    // First, get the timetable to check its batch and department
    const { data: timetable, error: fetchError } = await supabase
      .from('generated_timetables')
      .select('id, batch_id, status')
      .eq('id', timetableId)
      .single();

    if (fetchError || !timetable) {
      console.error('❌ Timetable not found:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Get batch to verify department
    const { data: batch } = await supabase
      .from('batches')
      .select('id, department_id, name')
      .eq('id', timetable.batch_id)
      .single();

    console.log('📊 Timetable details:', { 
      id: timetable.id, 
      batch_id: timetable.batch_id, 
      current_status: timetable.status,
      batch_department: batch?.department_id,
      batch_name: batch?.name
    });

    // Update timetable status to pending_approval
    const { error: updateError } = await supabase
      .from('generated_timetables')
      .update({ status: 'pending_approval' })
      .eq('id', timetableId);

    if (updateError) {
      console.error('❌ Error updating timetable status:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to update status: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Create workflow approval record
    const { error: workflowError } = await supabase
      .from('workflow_approvals')
      .insert({
        timetable_id: timetableId,
        workflow_step: 'submitted_for_review',
        performed_by: user.id,
        comments: 'Submitted for review by creator'
      });

    if (workflowError) {
      console.error('❌ Error creating workflow record:', workflowError);
      // Don't fail the entire operation for workflow error
    }

    console.log('✅ Timetable submitted for review successfully');

    return NextResponse.json({
      success: true,
      message: 'Timetable submitted for review! Publishers will be notified.'
    });

  } catch (error) {
    console.error('Unexpected error submitting timetable:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
