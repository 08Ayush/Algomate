import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { GetReviewQueueUseCase } from '@/modules/timetable';
import { requireAuth } from '@/lib/auth';

const reviewQueueUseCase = new GetReviewQueueUseCase(supabase);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    if (!user.department_id) {
      return NextResponse.json(
        { success: false, error: 'No department assigned to user.' },
        { status: 400 }
      );
    }

    const result = await reviewQueueUseCase.execute(user.department_id, user.faculty_type ?? '');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error fetching review queue:', error);
    const status = error.message.includes('Only publishers') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
}
