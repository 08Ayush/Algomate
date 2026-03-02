import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { allotment_id, student_id, subject_id } = body;

    // The allotment is stored in student_subject_choices with is_allotted=true
    // To revoke, we set is_allotted=false and allotment_status='pending'

    if (allotment_id) {
      // Revoke by allotment_id (which is the choice id)
      const { error } = await supabase
        .from('student_subject_choices')
        .update({
          is_allotted: false,
          allotment_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', allotment_id);

      if (error) {
        console.error('Error revoking allotment:', error);
        return NextResponse.json({ error: 'Failed to revoke allotment' }, { status: 500 });
      }
    } else if (student_id && subject_id) {
      // Legacy approach using student_id and subject_id
      const { error } = await supabase
        .from('student_subject_choices')
        .update({
          is_allotted: false,
          allotment_status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('student_id', student_id)
        .eq('subject_id', subject_id)
        .eq('is_allotted', true);

      if (error) {
        console.error('Error revoking allotment:', error);
        return NextResponse.json({ error: 'Failed to revoke allotment' }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Either allotment_id or student_id and subject_id are required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subject allocation revoked'
    });
  } catch (error: any) {
    console.error('Error revoking allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
