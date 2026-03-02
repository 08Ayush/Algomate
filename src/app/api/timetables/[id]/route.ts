import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { GetTimetableUseCase, SupabaseTimetableRepository, SupabaseScheduledClassRepository } from '@/modules/timetable';
import { requireAuth } from '@/lib/auth';

const timetableRepo = new SupabaseTimetableRepository(supabase);
const scheduledClassRepo = new SupabaseScheduledClassRepository(supabase);
const getTimetableUseCase = new GetTimetableUseCase(timetableRepo, scheduledClassRepo);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    // Await params in Next.js 15+
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    const result = await getTimetableUseCase.execute(id);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error fetching timetable:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status }
    );
  }
}