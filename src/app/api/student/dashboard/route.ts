import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Fetch user details with course and college info
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
        college_uid,
        course_id,
        college_id,
        course:courses!course_id (
          id,
          title,
          code,
          nature_of_course
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

    // For students, fetch batch based on course_id and current_semester
    if (userRole === 'student') {
      console.log('🎓 Looking for batch:');
      console.log('  Student ID:', userId);
      console.log('  Course ID:', userData.course_id);
      console.log('  Current Semester:', userData.current_semester);

      if (userData.course_id && userData.current_semester) {
        // Find the batch for this course and semester
        const { data: batchData, error: batchError } = await supabase
          .from('batches')
          .select(`
            id,
            name,
            section,
            semester,
            academic_year,
            actual_strength,
            course_id,
            course:courses!course_id (
              code
            )
          `)
          .eq('college_id', userData.college_id)
          .eq('course_id', userData.course_id)
          .eq('semester', userData.current_semester)
          .eq('is_active', true)
          .limit(1)
          .single();

        console.log('  Batch Query Result:', batchData);
        console.log('  Batch Query Error:', batchError);

        if (batchData && !batchError) {
          additionalData.batch = batchData;
          additionalData.batchId = batchData.id;
          console.log('✅ Found batch for course + semester:', batchData.name);
        } else {
          console.error('❌ No batch found for course_id:', userData.course_id, 'semester:', userData.current_semester);
          console.error('   Error:', batchError);
        }
      } else {
        console.error('❌ Student missing course_id or current_semester');
      }
    }

    // Get faculty members for the course
    const { data: facultyMembers, error: facultyError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        faculty_type,
        department_id,
        departments:departments!users_department_id_fkey (
          name,
          code
        )
      `)
      .eq('course_id', userData.course_id)
      .eq('role', 'faculty')
      .eq('is_active', true)
      .order('first_name');

    if (!facultyError && facultyMembers) {
      additionalData.facultyMembers = facultyMembers;
      additionalData.facultyCount = facultyMembers.length;
    } else {
      additionalData.facultyMembers = [];
      additionalData.facultyCount = 0;
    }

    // Get all approved events for the student's course (via batches linked to course)
    // First get batches for the student's course
    const { data: courseBatches } = await supabase
      .from('batches')
      .select('id, department_id')
      .eq('course_id', userData.course_id)
      .eq('is_active', true);
    
    const departmentIds = [...new Set((courseBatches ?? []).map(b => b.department_id).filter(Boolean))];
    
    let eventsData: Array<{
      id: string;
      title: string;
      description: string;
      event_type: string;
      event_date: string;
      event_time: string;
      end_time: string;
      location: string;
      status: string;
      created_by: string;
      creator: {
        first_name: string;
        last_name: string;
        faculty_type: string;
      } | null;
      start_date?: string;
      start_time?: string;
      venue?: string;
    }> = [];
    let eventsError: Error | null = null;
    
    if (departmentIds.length > 0) {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_type,
          event_date,
          event_time,
          end_time,
          location,
          status,
          created_by,
          creator:users!events_created_by_fkey (
            first_name,
            last_name,
            faculty_type
          )
        `)
        .in('department_id', departmentIds)
        .in('status', ['draft', 'published'])
        .order('event_date', { ascending: false })
        .limit(10);
      
      // Map event_date to start_date, event_time to start_time, location to venue for frontend compatibility
      eventsData = (data || []).map(event => ({
        ...event,
        creator: Array.isArray(event.creator) ? event.creator[0] || null : event.creator,
        start_date: event.event_date,
        start_time: event.event_time,
        venue: event.location
      }));
      eventsError = error;
    }

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
    }

    // Debug logging
    console.log('🔍 Dashboard API Response Data:');
    console.log('  User ID:', userData.id);
    console.log('  Course:', userData.course);
    console.log('  College:', userData.college);
    console.log('  Additional Data:', JSON.stringify(additionalData, null, 2));
    console.log('  Department IDs:', departmentIds);
    console.log('  Events fetched:', eventsData?.length || 0);
    if (eventsData && eventsData.length > 0) {
      console.log('  First event:', JSON.stringify(eventsData[0], null, 2));
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
