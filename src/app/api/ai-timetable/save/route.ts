import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { SaveGeneratedTimetableUseCase, SaveGeneratedTimetableDtoSchema } from '@/modules/timetable';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const saveUseCase = new SaveGeneratedTimetableUseCase(supabase);

// Save AI Generated Timetable
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    // Validate
    const dto = SaveGeneratedTimetableDtoSchema.parse(body);

    const result = await saveUseCase.execute(dto);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// Publish timetable for approval (Keeping this simple update logic here or could move to a separate UseCase)
export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { timetable_id, action } = body;

    // Reuse save case? No, this is just status update.
    // For now, simple update is fine or use PublishTimetableUseCase if we have it?
    // We have PublishTimetableUseCase! Let's check it later. For now, matching parity.

    const newStatus = action === 'publish' ? 'published' : 'pending_approval';

    const { data, error } = await supabase
      .from('generated_timetables')
      .update({
        status: newStatus,
        published_at: action === 'publish' ? new Date().toISOString() : null
      })
      .eq('id', timetable_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: {
        timetable_id: data.id,
        status: data.status,
        message: `Timetable ${action === 'publish' ? 'published' : 'submitted for approval'} successfully`
      }
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
