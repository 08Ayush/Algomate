import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { RejectTimetableUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { requireAuth } from '@/lib/auth';
import { notifyTimetableRejected } from '@/lib/notificationService';

const timetableRepo = new SupabaseTimetableRepository(supabase);
const rejectUseCase = new RejectTimetableUseCase(timetableRepo);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth handled by middleware - just get user from headers (FAST!)
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    // Await params in Next.js 15+
    const { id } = await params;

    const body = await request.json();
    const { reason } = body;

    const result = await rejectUseCase.execute(id, user.id, user.faculty_type || '', reason);

    // Send notification to creator about rejection
    if (result.success && result.timetable) {
      const timetable = result.timetable;
      const rejectorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'A reviewer';

      console.log('📧 Rejection notification data:', {
        timetableId: id,
        timetableTitle: timetable.title || 'Untitled Timetable',
        batchId: timetable.batch_id,
        creatorId: timetable.created_by,
        rejectorId: user.id,
        rejectorName,
        reason,
        shouldNotify: timetable.created_by && timetable.created_by !== user.id
      });

      // Notify creator that their timetable was rejected
      if (timetable.created_by && timetable.created_by !== user.id) {
        const notifyResult = await notifyTimetableRejected({
          timetableId: id,
          timetableTitle: timetable.title || 'Untitled Timetable',
          batchId: timetable.batch_id,
          creatorId: timetable.created_by,
          rejectorId: user.id,
          rejectorName,
          reason
        });
        console.log('📧 Rejection notification result:', notifyResult);
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error rejecting timetable:', error);
    const status = error.message.includes('Only publishers') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
}
