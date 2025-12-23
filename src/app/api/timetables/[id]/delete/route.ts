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

export async function DELETE(
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

    const timetableId = params.id;

    console.log('🗑️ Deleting timetable:', timetableId);

    // Step 1: Delete workflow approvals first (foreign key constraint)
    const { error: approvalError } = await supabase
      .from('workflow_approvals')
      .delete()
      .eq('timetable_id', timetableId);

    if (approvalError) {
      console.error('❌ Error deleting workflow approvals:', approvalError);
      return NextResponse.json(
        { success: false, error: `Failed to delete workflow approvals: ${approvalError.message}` },
        { status: 500 }
      );
    }

    // Step 2: Delete scheduled classes (if not cascade)
    const { error: classesError } = await supabase
      .from('scheduled_classes')
      .delete()
      .eq('timetable_id', timetableId);

    if (classesError) {
      console.error('❌ Error deleting scheduled classes:', classesError);
      // Continue anyway, might cascade
    }

    // Step 3: Delete the timetable
    const { error: timetableError } = await supabase
      .from('generated_timetables')
      .delete()
      .eq('id', timetableId);

    if (timetableError) {
      console.error('❌ Error deleting timetable:', timetableError);
      return NextResponse.json(
        { success: false, error: `Failed to delete timetable: ${timetableError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Timetable deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Timetable deleted successfully!'
    });

  } catch (error) {
    console.error('Unexpected error deleting timetable:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
