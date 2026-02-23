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
    const { batch_id } = body;

    // Mark all pending choices as allocated for the batch
    await supabase
      .from('student_subject_choices')
      .update({ status: 'allocated' } as any)
      .eq('status', 'pending')
      .in('student_id',
        supabase.from('users').select('id').eq('batch_id', batch_id)
      );

    return NextResponse.json({
      success: true,
      message: 'Allotment completed successfully'
    });
  } catch (error: any) {
    console.error('Error completing allotment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}