import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ApproveTimetableUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const timetableRepo = new SupabaseTimetableRepository(supabase);
const approveUseCase = new ApproveTimetableUseCase(timetableRepo);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const result = await approveUseCase.execute(params.id, user.id, user.faculty_type);
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
