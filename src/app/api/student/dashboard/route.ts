import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userRole = searchParams.get('role');

    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    // Fetch user details with department and college info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        faculty_type,
        current_semester,
        department_id,
        college_id,
        department:departments!department_id (
          id,
          name,
          code
        ),
        college:colleges!college_id (
          id,
          name
        )
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    let additionalData: any = {};

    // For students, fetch batch and enrollment info
    if (userRole === 'student') {
      // Get student's batch enrollment
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('student_batch_enrollment')
        .select(`
          batch_id,
          batch:batches!batch_id (
            id,
            name,
            section,
            semester,
            academic_year,
            actual_strength
          )
        `)
        .eq('student_id', userId)
        .eq('is_active', true)
        .single();

      if (enrollmentData && !enrollmentError) {
        additionalData.batch = enrollmentData.batch;
        additionalData.batchId = enrollmentData.batch_id;
      } else {
        console.error('Error fetching enrollment:', enrollmentError);
      }
    }

    // Get faculty count for the department
    const { count: facultyCount, error: facultyError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', userData.department_id)
      .eq('role', 'faculty')
      .eq('is_active', true);

    if (!facultyError) {
      additionalData.facultyCount = facultyCount || 0;
    }

    // Get approved events for the department
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_type,
        start_date,
        end_date,
        start_time,
        end_time,
        venue,
        status,
        created_by,
        creator:users!events_created_by_fkey (
          first_name,
          last_name,
          faculty_type
        )
      `)
      .eq('department_id', userData.department_id)
      .eq('status', 'approved')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(8);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    return NextResponse.json({
      success: true,
      user: userData,
      additionalData,
      events: eventsData || [],
    });
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
