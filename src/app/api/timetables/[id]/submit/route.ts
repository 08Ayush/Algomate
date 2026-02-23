import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubmitForApprovalUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { authenticate } from '@/shared/middleware/auth';
import { notifyTimetableSubmittedForApproval } from '@/lib/notificationService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const timetableRepo = new SupabaseTimetableRepository(supabase);
const submitUseCase = new SubmitForApprovalUseCase(timetableRepo);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Pass faculty_type as the role (creator/publisher/general)
    const result = await submitUseCase.execute(
      id,
      user.id,
      user.faculty_type || '' // Pass faculty_type, not department_id
    );

    // Send notification to publishers/approvers
    if (result.success && result.timetable) {
      const timetable = result.timetable;

      // Fetch batch and department info for notification
      const { data: batch } = await supabase
        .from('batches')
        .select('id, department_id')
        .eq('id', timetable.batch_id)
        .single();

      if (batch) {
        const creatorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'A faculty member';

        console.log('📧 Sending notification with params:', {
          timetableId: id,
          timetableTitle: timetable.title || 'Untitled Timetable',
          batchId: timetable.batch_id,
          departmentId: batch.department_id,
          creatorId: user.id,
          creatorName
        });

        const notifyResult = await notifyTimetableSubmittedForApproval({
          timetableId: id,
          timetableTitle: timetable.title || 'Untitled Timetable',
          batchId: timetable.batch_id,
          departmentId: batch.department_id,
          creatorId: user.id,
          creatorName
        });

        console.log('📧 Notification result:', notifyResult);
      } else {
        console.warn('⚠️ No batch found for timetable:', timetable.batch_id);
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error submitting timetable:', error);
    const status = error.message.includes('Only creators') ? 403 :
      error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
}
