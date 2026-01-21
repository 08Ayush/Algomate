import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DeleteTimetableUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { authenticate } from '@/shared/middleware/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const timetableRepo = new SupabaseTimetableRepository(supabase);
const deleteUseCase = new DeleteTimetableUseCase(timetableRepo);

export async function DELETE(
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

    const result = await deleteUseCase.execute(params.id, user.id);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error deleting timetable:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
}
