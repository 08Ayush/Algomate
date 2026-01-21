import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user || user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { student_id, old_subject_id, new_subject_id } = body;

    // Revoke old allocation
    await supabase
      .from('student_subject_choices')
      .update({ status: 'revoked' } as any)
      .eq('student_id', student_id)
      .eq('subject_id', old_subject_id);

    // Create new allocation
    await supabase
      .from('student_subject_choices')
      .insert({
        student_id,
        subject_id: new_subject_id,
        status: 'allocated'
      } as any);

    return NextResponse.json({
      success: true,
      message: 'Subject allocation converted successfully'
    });
  } catch (error: any) {
    console.error('Error converting allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
