import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // Get student data
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (studentError) {
      console.error('Student fetch error:', studentError);
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', student.course_id)
      .single();

    if (courseError) {
      console.error('Course fetch error:', courseError);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({
      student,
      course
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}