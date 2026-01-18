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

    // Parallelize all database queries for faster loading
    const [
      { data: userData, error: userError },
    ] = await Promise.all([
      supabase
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
        .single()
    ]);

    if (userError || !userData) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    let additionalData: any = {};

    // Parallelize student-specific queries
    if (userRole === 'student' && userData.course_id && userData.current_semester) {
      console.log('🎓 Looking for batch:', { course_id: userData.course_id, semester: userData.current_semester });

      // Fetch batch, faculty, and course batches in parallel
      const [
        { data: batchData, error: batchError },
        { data: facultyMembers, error: facultyError },
        { data: courseBatches }
      ] = await Promise.all([
        supabase
          .from('batches')
          .select(`
            id,
            name,
            section,
            semester,
            academic_year,
            actual_strength,
            course_id,
            department_id,
            course:courses!course_id (
              code
            ),
            departments:departments!batches_department_id_fkey (
              id,
              name,
              code
            )
          `)
          .eq('college_id', userData.college_id)
          .eq('course_id', userData.course_id)
          .eq('semester', userData.current_semester)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
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
          .order('first_name'),
        supabase
          .from('batches')
          .select('id, department_id')
          .eq('course_id', userData.course_id)
          .eq('is_active', true)
      ]);

      if (batchData && !batchError) {
        additionalData.batch = batchData;
        additionalData.batchId = batchData.id;
        console.log('✅ Found batch:', batchData.name);
      } else {
        console.warn('⚠️ No batch found for course + semester');
      }

      additionalData.facultyMembers = facultyMembers || [];
      additionalData.facultyCount = facultyMembers?.length || 0;

      // Fetch events in parallel for course departments
      const departmentIds = [...new Set((courseBatches ?? []).map(b => b.department_id).filter(Boolean))];

      if (departmentIds.length > 0) {
        const { data: eventsData, error: eventsError } = await supabase
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

        additionalData.events = (eventsData || []).map(event => ({
          ...event,
          creator: Array.isArray(event.creator) ? event.creator[0] || null : event.creator,
          start_date: event.event_date,
          start_time: event.event_time,
          venue: event.location
        }));

        if (eventsError) {
          console.error('Error fetching events:', eventsError);
        }
      }
    } else {
      // For non-students, still fetch faculty
      const { data: facultyMembers } = await supabase
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

      additionalData.facultyMembers = facultyMembers || [];
      additionalData.facultyCount = facultyMembers?.length || 0;
    }

    // Debug logging
    console.log('🔍 Dashboard API Response Data:');
    console.log('  User ID:', userData.id);
    console.log('  Course:', userData.course);
    console.log('  College:', userData.college);
    console.log('  Events fetched:', additionalData.events?.length || 0);

    return NextResponse.json({
      success: true,
      user: userData,
      additionalData,
      events: additionalData.events || [],
    });
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
