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

    // Only publishers can reject timetables
    if (user.faculty_type !== 'publisher') {
      return NextResponse.json(
        { success: false, error: 'Only publishers can reject timetables.' },
        { status: 403 }
      );
    }

    const timetableId = params.id;
    const body = await request.json();
    const { reason } = body;

    console.log('❌ Rejecting timetable:', timetableId);

    // Update timetable status to rejected
    // Note: Rejection reason is stored in workflow_approvals table
    const { error: updateError } = await supabase
      .from('generated_timetables')
      .update({ 
        status: 'rejected'
      })
      .eq('id', timetableId);

    if (updateError) {
      console.error('❌ Error rejecting timetable:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to reject: ${updateError.message}` },
        { status: 500 }
      );
    }

    // Add workflow rejection record
    const { error: workflowError } = await supabase
      .from('workflow_approvals')
      .insert({
        timetable_id: timetableId,
        workflow_step: 'rejected',
        performed_by: user.id,
        comments: reason || 'Rejected by publisher'
      });

    if (workflowError) {
      console.error('❌ Error creating workflow record:', workflowError);
      // Don't fail the entire operation for workflow error
    }

    console.log('✅ Timetable rejected successfully');

    return NextResponse.json({
      success: true,
      message: 'Timetable rejected successfully.'
    });

  } catch (error) {
    console.error('Unexpected error rejecting timetable:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
