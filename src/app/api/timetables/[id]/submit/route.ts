import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SubmitForApprovalUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { authenticate } from '@/shared/middleware/auth';

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
