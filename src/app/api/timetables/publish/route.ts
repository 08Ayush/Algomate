import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  PublishTimetableUseCase,
  ApproveTimetableUseCase,
  RejectTimetableUseCase,
  SubmitForApprovalUseCase,
  SupabaseTimetableRepository
} from '@/modules/timetable';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const timetableRepo = new SupabaseTimetableRepository(supabase);
const publishUseCase = new PublishTimetableUseCase(timetableRepo);
const approveUseCase = new ApproveTimetableUseCase(timetableRepo);
const rejectUseCase = new RejectTimetableUseCase(timetableRepo);
const submitUseCase = new SubmitForApprovalUseCase(timetableRepo);

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { timetableId, action, reason, publisherId } = body;

    if (!timetableId || !action || !publisherId) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'submit_for_review':
        result = await submitUseCase.execute(timetableId, publisherId, user.faculty_type);
        break;

      case 'approve':
        result = await approveUseCase.execute(timetableId, publisherId, user.faculty_type);
        // After approval, publish to make it live
        await publishUseCase.execute(timetableId, publisherId);
        break;

      case 'reject':
        result = await rejectUseCase.execute(timetableId, publisherId, user.faculty_type, reason);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be: approve, reject, or submit_for_review', success: false },
          { status: 400 }
        );
    }

    return NextResponse.json({
      ...result,
      status: action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'pending_approval',
      message: `Timetable ${action === 'approve' ? 'approved and published' : action === 'reject' ? 'rejected' : 'submitted for review'} successfully`
    });

  } catch (error: any) {
    console.error('Error in publish workflow:', error);
    const status = error.message.includes('Only') ? 403 : 500;
    return NextResponse.json(
      { error: error.message || 'Internal server error', success: false },
      { status }
    );
  }
}