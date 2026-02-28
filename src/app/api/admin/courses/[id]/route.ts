import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Create server-side supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// PUT - Update existing course
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { title, code, nature_of_course, intake, duration_years } = await request.json();

    if (!title || !code) {
      return NextResponse.json(
        { error: 'Title and code are required' },
        { status: 400 }
      );
    }

    // Verify the course belongs to the user's college
    const { data: existingCourse } = await supabaseAdmin
      .from('courses')
      .select('id, college_id')
      .eq('id', params.id)
      .single();

    if (!existingCourse || existingCourse.college_id !== user.college_id) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    // Check if code is being changed to an existing one
    const { data: duplicateCourse } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('code', code)
      .eq('college_id', user.college_id)
      .neq('id', params.id)
      .single();

    if (duplicateCourse) {
      return NextResponse.json(
        { error: 'Course code already exists in your college' },
        { status: 400 }
      );
    }

    // Update course
    const { data: updatedCourse, error } = await supabaseAdmin
      .from('courses')
      .update({
        title,
        code: code.toUpperCase(),
        nature_of_course: nature_of_course || null,
        intake: intake || 0,
        duration_years: duration_years || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Course update error:', error);
      return NextResponse.json(
        { error: 'Failed to update course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });

  } catch (error: any) {
    console.error('Course update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    // Verify the course belongs to the user's college
    const { data: existingCourse } = await supabaseAdmin
      .from('courses')
      .select('id, college_id, code')
      .eq('id', params.id)
      .single();

    if (!existingCourse || existingCourse.college_id !== user.college_id) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      );
    }

    // Check if course is being used by subjects
    const { data: relatedSubjects } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('course_id', params.id)
      .limit(1);

    if (relatedSubjects && relatedSubjects.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete course. It is being used by subjects.' },
        { status: 400 }
      );
    }

    // Delete the course
    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Course deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Course deleted successfully'
    });

  } catch (error: any) {
    console.error('Course deletion API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
