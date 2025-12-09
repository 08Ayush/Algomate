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

    // Get subject details to determine selection type
    const { data: subject } = await supabase
      .from('subjects')
      .select('nep_category, subject_domain')
      .eq('id', subject_id)
      .single();

    // Determine selection type
    let selectionType = 'ELECTIVE';
    if (subject?.nep_category && ['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(subject.nep_category)) {
      selectionType = 'MAJOR';
    } else if (subject?.nep_category && ['MINOR', 'CORE MINOR'].includes(subject.nep_category)) {
      selectionType = 'MINOR';
    } else if (subject?.nep_category && ['CORE', 'CORE PARTIAL'].includes(subject.nep_category)) {
      selectionType = 'CORE';
    }

    // Check for existing MAJOR from semester 3+ (only for MAJOR selections)
    if (selectionType === 'MAJOR' && parseInt(semester) >= 3) {
      const { data: existingMajors } = await supabase
        .from('student_course_selections')
        .select(`
          id,
          semester,
          is_locked,
          selection_type,
          subjects!inner (
            subject_domain,
            nep_category
          )
        `)
        .eq('student_id', student_id)
        .gte('semester', 3)
        .order('semester', { ascending: true });

      // Find any existing MAJOR selection from sem 3+
      const existingMajor = existingMajors?.find((sel: any) => {
        const subjectData = Array.isArray(sel.subjects) ? sel.subjects[0] : sel.subjects;
        return sel.selection_type === 'MAJOR' || 
               ['MAJOR', 'CORE MAJOR', 'ADVANCED MAJOR'].includes(subjectData?.nep_category || '');
      });

      if (existingMajor) {
        const existingSubjectData = Array.isArray(existingMajor.subjects) ? existingMajor.subjects[0] : existingMajor.subjects;
        // Check if new subject is from same domain
        if (subject?.subject_domain !== existingSubjectData?.subject_domain) {
          return NextResponse.json({ 
            error: `Cannot change MAJOR subject. You selected a MAJOR in Semester ${existingMajor.semester} from the "${existingSubjectData?.subject_domain}" domain. You must continue with subjects from the same domain.`,
            locked_domain: existingSubjectData?.subject_domain,
            locked_semester: existingMajor.semester
          }, { status: 403 });
        }
      }
    }

    // Insert new selection (trigger will handle locking logic)
    const { data: newSelection, error } = await supabase
      .from('student_course_selections')
      .insert({
        student_id,
        subject_id,
        semester: parseInt(semester),
        academic_year,
        selection_type: selectionType
      })
      .select(`
        id,
        student_id,
        subject_id,
        semester,
        academic_year,
        selection_type,
        is_locked,
        locked_at,
        subjects (
          id,
          code,
          name,
          credit_value,
          nep_category,
          subject_type,
          course_group_id,
          subject_domain
        )
      `)
      .single();

    if (error) {
      console.error('Database error:', error);
      // Check if it's a constraint violation from trigger
      if (error.message.includes('Cannot change MAJOR')) {
        return NextResponse.json({ 
          error: error.message 
        }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to add selection' }, { status: 500 });
    }

    return NextResponse.json({ 
      selection: newSelection,
      message: 'Subject selected successfully',
      is_locked: newSelection.is_locked,
      selection_type: newSelection.selection_type
    }, { status: 201 });

  } catch (error: any) {
    console.error('Server error:', error);
    // Check for database constraint errors
    if (error.message && error.message.includes('Cannot change MAJOR')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
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

    // Check if selection can be deleted (check for locked MAJOR)
    const { data: selection } = await supabase
      .from('student_course_selections')
      .select('selection_type, is_locked, semester')
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .single();

    if (selection) {
      if (selection.selection_type === 'MAJOR' && selection.is_locked) {
        return NextResponse.json({ 
          error: `Cannot delete locked MAJOR subject. MAJOR selections are permanent from Semester ${selection.semester} onwards.`,
          is_locked: true
        }, { status: 403 });
      }

      if (selection.selection_type === 'CORE') {
        return NextResponse.json({ 
          error: 'Cannot delete core/mandatory subjects.',
          is_core: true
        }, { status: 403 });
      }
    }

    // Delete the selection (trigger will also enforce constraints)
    const { error } = await supabase
      .from('student_course_selections')
      .delete()
      .eq('student_id', student_id)
      .eq('subject_id', subject_id);

    if (error) {
      console.error('Database error:', error);
      // Check if trigger prevented deletion
      if (error.message.includes('Cannot delete a locked MAJOR')) {
        return NextResponse.json({ 
          error: 'Cannot delete locked MAJOR subject. MAJOR selections are permanent from Semester 3.' 
        }, { status: 403 });
      }
      return NextResponse.json({ error: 'Failed to remove selection' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Subject selection removed successfully'
    });

  } catch (error: any) {
    console.error('Server error:', error);
    if (error.message && error.message.includes('Cannot delete')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}