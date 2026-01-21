import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GetTimetableUseCase, SupabaseTimetableRepository, SupabaseScheduledClassRepository } from '@/modules/timetable';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const timetableRepo = new SupabaseTimetableRepository(supabase);
const scheduledClassRepo = new SupabaseScheduledClassRepository(supabase);
const getTimetableUseCase = new GetTimetableUseCase(timetableRepo, scheduledClassRepo);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id) {
      return NextResponse.json(
        { error: 'Timetable ID is required' },
        { status: 400 }
      );
    }

    const result = await getTimetableUseCase.execute(params.id);
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