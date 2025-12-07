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

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

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
      console.error('Error fetching timetables:', timetableError);
      return NextResponse.json(
        { error: 'Failed to fetch timetables' },
        { status: 500 }
      );
    }

    // Filter timetables by course (through batch)
    const filteredTimetables = timetables?.filter(
      (tt: any) => tt.batches?.course_id === courseId
    ) || [];

    // Get all batches for the course
    const { data: batchesData, error: batchesError } = await supabase
      .from('batches')
      .select('id, name, section, semester, academic_year')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('semester', { ascending: true })
      .order('section', { ascending: true });

    if (batchesError) {
      console.error('Error fetching batches:', batchesError);
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
