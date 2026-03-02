import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { DeleteTimetableUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { requireAuth } from '@/lib/auth';

const timetableRepo = new SupabaseTimetableRepository(supabase);
const deleteUseCase = new DeleteTimetableUseCase(timetableRepo);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth handled by middleware - just get user from headers (FAST!)
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    // Await params in Next.js 15+
    const { id } = await params;

    const result = await deleteUseCase.execute(id, user.id);
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
