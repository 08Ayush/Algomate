import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { batch_id } = body;

    // First, get all student IDs for the batch
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id')
      .eq('batch_id', batch_id);

    if (studentError) {
      console.error('Error fetching students:', studentError);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No students found for this batch'
      });
    }

    const studentIds = students.map(s => s.id);

    // Mark all pending choices as allocated for the batch students
    const { error: updateError } = await supabase
      .from('student_subject_choices')
      .update({ status: 'allocated' } as any)
      .eq('status', 'pending')
      .in('student_id', studentIds);

    if (updateError) {
      console.error('Error updating choices:', updateError);
      return NextResponse.json({ error: 'Failed to update choices' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Allotment completed successfully'
    });
  } catch (error: any) {
    console.error('Error completing allotment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}