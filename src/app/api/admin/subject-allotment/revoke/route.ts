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
    const { student_id, subject_id } = body;

    // Revoke allocation by updating choice status
    await supabase
      .from('student_subject_choices')
      .update({ status: 'revoked' } as any)
      .eq('student_id', student_id)
      .eq('subject_id', subject_id);

    return NextResponse.json({
      success: true,
      message: 'Subject allocation revoked'
    });
  } catch (error: any) {
    console.error('Error revoking allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
