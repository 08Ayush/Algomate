import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { UnpublishTimetableUseCase, SupabaseTimetableRepository } from '@/modules/timetable';
import { requireAuth } from '@/lib/auth';

const timetableRepo = new SupabaseTimetableRepository(supabase);
const unpublishUseCase = new UnpublishTimetableUseCase(timetableRepo);

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

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const result = await unpublishUseCase.execute(id, user.id, user.faculty_type || '');
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error unpublishing timetable:', error);
    const status = error.message.includes('Only publishers') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
}
