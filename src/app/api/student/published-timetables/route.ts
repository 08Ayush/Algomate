import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

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

    // Build query for published timetables — filter by course at DB level using !inner join
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
        batches!inner (
          id,
          name,
          section,
          semester,
          academic_year,
          course_id
        )
      `)
      .eq('status', 'published')
      .eq('batches.course_id', courseId)
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

    // Fetch timetables and batches in parallel
    const [
      { data: timetables, error: timetableError },
      { data: batchesData, error: batchesError }
    ] = await Promise.all([
      query,
      supabase
        .from('batches')
        .select('id, name, section, semester, academic_year')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('semester', { ascending: true })
        .order('section', { ascending: true })
    ]);

    if (timetableError) {
      console.error('❌ Error fetching timetables:', timetableError);
      return NextResponse.json(
        { error: 'Failed to fetch timetables' },
        { status: 500 }
      );
    }

    if (batchesError) {
      console.error('❌ Error fetching batches:', batchesError);
    }

    return NextResponse.json({
      success: true,
      timetables: timetables || [],
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
