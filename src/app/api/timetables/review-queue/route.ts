import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GetReviewQueueUseCase } from '@/modules/timetable';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
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
