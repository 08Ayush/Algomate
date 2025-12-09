import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const batchId = searchParams.get('batchId');

    console.log('📚 Fetching published timetables with params:', { courseId, semester, batchId });

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // First, let's check what timetables exist (for debugging)
    const { data: allTimetables, error: debugError } = await supabase
      .from('generated_timetables')
      .select('id, title, status, batch_id, batches(id, name, course_id)')
      .limit(5);
    
    console.log('🔍 Debug: Sample timetables in DB:', allTimetables);
    console.log('🔍 Debug: Any errors?', debugError);

    // Build query for published timetables
    let query = supabase
      .from('generated_timetables')
      .select(`
        id,
        title,
        academic_year,
        semester,
        fitness_score,
        created_at,
        approved_at,
        batch_id,
        batches (
          id,
          name,
          section,
          semester,
          academic_year,
          course_id
        )
      `)
      .eq('status', 'published')
      .order('approved_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    // Filter by semester if provided
    if (semester) {
      query = query.eq('semester', parseInt(semester));
    }

    // Filter by specific batch if provided
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data: timetables, error: timetableError } = await query;

    if (timetableError) {
      console.error('❌ Error fetching timetables:', timetableError);
      return NextResponse.json(
        { error: 'Failed to fetch timetables' },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${timetables?.length || 0} published timetables (before filtering)`);
    console.log('📊 Timetables:', timetables?.map(t => ({ id: t.id, title: t.title, batch_id: t.batch_id, course_id: t.batches?.course_id })));

    // Filter timetables by course (through batch)
    const filteredTimetables = timetables?.filter(
      (tt: any) => tt.batches?.course_id === courseId
    ) || [];

    console.log(`✅ ${filteredTimetables.length} timetables match courseId: ${courseId}`);

    // Get all batches for the course
    const { data: batchesData, error: batchesError } = await supabase
      .from('batches')
      .select('id, name, section, semester, academic_year')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('semester', { ascending: true })
      .order('section', { ascending: true });

    if (batchesError) {
      console.error('❌ Error fetching batches:', batchesError);
    } else {
      console.log(`📦 Found ${batchesData?.length || 0} active batches for courseId: ${courseId}`);
    }

    return NextResponse.json({
      success: true,
      timetables: filteredTimetables,
      batches: batchesData || [],
    });
  } catch (error) {
    console.error('Error in published timetables API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
