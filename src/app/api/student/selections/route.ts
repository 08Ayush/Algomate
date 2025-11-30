import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch student's course selections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const semester = searchParams.get('semester');
    const academicYear = searchParams.get('academicYear');
    
    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    let query = supabase
      .from('student_course_selections')
      .select(`
        id,
        student_id,
        subject_id,
        semester,
        academic_year,
        subjects (
          id,
          code,
          name,
          credit_value,
          nep_category,
          subject_type,
          course_group_id,
          semester,
          description
        )
      `)
      .eq('student_id', studentId)
      .order('id', { ascending: false });

    if (semester) {
      query = query.eq('semester', parseInt(semester));
    }

    if (academicYear) {
      query = query.eq('academic_year', academicYear);
    }

    const { data: selections, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch selections' }, { status: 500 });
    }

    return NextResponse.json({ 
      selections: selections || [],
      count: selections?.length || 0
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Add new course selection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, subject_id, semester, academic_year } = body;
    
    if (!student_id || !subject_id || !semester || !academic_year) {
      return NextResponse.json({ 
        error: 'Missing required fields: student_id, subject_id, semester, academic_year' 
      }, { status: 400 });
    }

    // Check if selection already exists
    const { data: existingSelection } = await supabase
      .from('student_course_selections')
      .select('id')
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .eq('semester', semester)
      .eq('academic_year', academic_year)
      .single();

    if (existingSelection) {
      return NextResponse.json({ 
        error: 'Subject already selected for this semester' 
      }, { status: 409 });
    }

    // Insert new selection
    const { data: newSelection, error } = await supabase
      .from('student_course_selections')
      .insert({
        student_id,
        subject_id,
        semester: parseInt(semester),
        academic_year
      })
      .select(`
        id,
        student_id,
        subject_id,
        semester,
        academic_year,
        subjects (
          id,
          code,
          name,
          credit_value,
          nep_category,
          subject_type,
          course_group_id
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to add selection' }, { status: 500 });
    }

    return NextResponse.json({ 
      selection: newSelection,
      message: 'Subject selected successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove course selection
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, subject_id } = body;
    
    if (!student_id || !subject_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: student_id, subject_id' 
      }, { status: 400 });
    }

    // Delete the selection
    const { error } = await supabase
      .from('student_course_selections')
      .delete()
      .eq('student_id', student_id)
      .eq('subject_id', subject_id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to remove selection' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Subject selection removed successfully'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}