import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// List Hybrid Generated Timetables
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const department_id = searchParams.get('department_id');
    const status = searchParams.get('status'); // pending_approval, approved, rejected

    let query = supabase
      .from('generated_timetables')
      .select(`
        *,
        batch:batches (
          id,
          name,
          semester,
          academic_year,
          department:departments (
            id,
            name
          )
        ),
        creator:users!created_by (
          id,
          first_name,
          last_name
        ),
        scheduled_classes (
          id,
          class_type
        )
      `)
      .eq('generation_method', 'HYBRID')
      .order('created_at', { ascending: false });

    // Filter by department
    if (department_id) {
      // First get batches for department
      const { data: batches } = await supabase
        .from('batches')
        .select('id')
        .eq('department_id', department_id);
      
      const batchIds = batches?.map(b => b.id) || [];
      if (batchIds.length > 0) {
        query = query.in('batch_id', batchIds);
      }
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    const { data: timetables, error } = await query;

    if (error) {
      console.error('❌ Error fetching timetables:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Format response
    const formattedTimetables = timetables?.map((tt: any) => {
      const theoryClasses = tt.scheduled_classes?.filter((c: any) => 
        c.class_type === 'THEORY' || c.class_type === 'TUTORIAL'
      ).length || 0;
      
      const labClasses = tt.scheduled_classes?.filter((c: any) => 
        c.class_type === 'LAB' || c.class_type === 'PRACTICAL'
      ).length || 0;

      return {
        id: tt.id,
        title: tt.title,
        batch_id: tt.batch_id,
        batch_name: tt.batch?.name || 'Unknown Batch',
        department_name: tt.batch?.department?.name || 'Unknown Department',
        semester: tt.semester,
        academic_year: tt.academic_year,
        fitness_score: tt.fitness_score || 0,
        generation_method: tt.generation_method,
        status: tt.status,
        created_by: tt.created_by,
        creator_name: `${tt.creator?.first_name || ''} ${tt.creator?.last_name || ''}`.trim() || 'Unknown',
        created_at: tt.created_at,
        classes_count: tt.scheduled_classes?.length || 0,
        theory_count: theoryClasses,
        lab_count: labClasses
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: formattedTimetables
    });

  } catch (error: any) {
    console.error('❌ List error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch hybrid timetables'
    }, { status: 500 });
  }
}
