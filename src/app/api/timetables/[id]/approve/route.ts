import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApproveTimetableUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { authenticate } from '@/shared/middleware/auth';
import { notifyTimetableApproved, notifyTimetablePublished } from '@/lib/notificationService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const timetableRepo = new SupabaseTimetableRepository(supabase);
const approveUseCase = new ApproveTimetableUseCase(timetableRepo);

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

    // Parse request body for notification options
    let notifyStudents = true; // Default to true
    try {
      const body = await request.json();
      notifyStudents = body.notifyStudents !== false;
    } catch {
      // No body or invalid JSON - use defaults
    }

    const result = await approveUseCase.execute(id, user.id, user.faculty_type || '');

    // Send notifications after approval
    if (result.success && result.timetable) {
      const timetable = result.timetable;
      const approverName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'An approver';

      // Fetch batch and department info
      const { data: batch } = await supabase
        .from('batches')
        .select('id, department_id')
        .eq('id', timetable.batch_id)
        .single();

      // Notify creator that their timetable was approved
      if (timetable.created_by && timetable.created_by !== user.id) {
        await notifyTimetableApproved({
          timetableId: id,
          timetableTitle: timetable.title || 'Untitled Timetable',
          batchId: timetable.batch_id,
          creatorId: timetable.created_by,
          approverId: user.id,
          approverName
        });
        console.log('✅ Creator notified of approval');
      }

      // Notify faculty and optionally students about published timetable
      if (batch) {
        await notifyTimetablePublished({
          timetableId: id,
          timetableTitle: timetable.title || 'Untitled Timetable',
          batchId: timetable.batch_id,
          departmentId: batch.department_id,
          publisherId: user.id,
          publisherName: approverName,
          notifyStudents,
          notifyFaculty: true
        });
        console.log(`✅ Timetable published notification sent (students: ${notifyStudents})`);
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error approving timetable:', error);
    const status = error.message.includes('Only publishers') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
}
