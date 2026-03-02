import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    if (user.role !== 'college_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { allocations } = body;

    if (!Array.isArray(allocations)) {
      return NextResponse.json(
        { error: 'allocations must be an array' },
        { status: 400 }
      );
    }

    // Batch convert allocations
    for (const { student_id, old_subject_id, new_subject_id } of allocations) {
      await supabase
        .from('student_subject_choices')
        .update({ status: 'revoked' } as any)
        .eq('student_id', student_id)
        .eq('subject_id', old_subject_id);

      await supabase
        .from('student_subject_choices')
        .insert({
          student_id,
          subject_id: new_subject_id,
          status: 'allocated'
        } as any);
    }

    return NextResponse.json({
      success: true,
      message: `Converted ${allocations.length} allocations`
    });
  } catch (error: any) {
    console.error('Error converting allocations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
