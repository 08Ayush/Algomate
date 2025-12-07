import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all faculty qualifications or by faculty_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('faculty_id');
    const courseId = searchParams.get('course_id');
    const collegeId = searchParams.get('college_id');

    console.log('📥 Fetching faculty qualifications:', { facultyId, courseId, collegeId });

    let query = supabase
      .from('faculty_qualified_subjects')
      .select(`
        id,
        faculty_id,
        subject_id,
        proficiency_level,
        preference_score,
        teaching_load_weight,
        is_primary_teacher,
        can_handle_lab,
        can_handle_tutorial,
        created_at,
        faculty:users!faculty_qualified_subjects_faculty_id_fkey(
          id,
          first_name,
          last_name,
          email,
          course_id,
          college_id
        ),
        subject:subjects(
          id,
          name,
          code,
          subject_type,
          semester,
          credits_per_week,
          requires_lab,
          course_id,
          college_id
        )
      `)
      .order('created_at', { ascending: false });

    if (facultyId) {
      query = query.eq('faculty_id', facultyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching qualifications:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch qualifications',
        details: error.message
      }, { status: 500 });
    }

    // Filter by course or college if specified (post-query filtering since we can't filter on nested fields directly)
    let filteredData = data || [];
    
    if (collegeId) {
      filteredData = filteredData.filter(qual => {
        const faculty = Array.isArray(qual.faculty) ? qual.faculty[0] : qual.faculty;
        const subject = Array.isArray(qual.subject) ? qual.subject[0] : qual.subject;
        return faculty?.college_id === collegeId && subject?.college_id === collegeId;
      });
      console.log(`🔍 Filtered to ${filteredData.length} qualifications for college ${collegeId}`);
    } else if (courseId) {
      filteredData = filteredData.filter(qual => {
        const faculty = Array.isArray(qual.faculty) ? qual.faculty[0] : qual.faculty;
        const subject = Array.isArray(qual.subject) ? qual.subject[0] : qual.subject;
        return faculty?.course_id === courseId && 
               subject?.course_id === courseId;
      });
      console.log(`🔍 Filtered to ${filteredData.length} qualifications for course ${courseId}`);
    }

    console.log(`✅ Found ${filteredData.length} qualifications`);

    return NextResponse.json({
      success: true,
      qualifications: filteredData
    });

  } catch (error: any) {
    console.error('❌ Exception in GET /api/faculty/qualifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// POST: Add new faculty-subject qualification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      faculty_id,
      subject_id,
      proficiency_level = 7,
      preference_score = 5,
      teaching_load_weight = 1.0,
      is_primary_teacher = false,
      can_handle_lab = true,
      can_handle_tutorial = true
    } = body;

    console.log('📥 Adding faculty qualification:', {
      faculty_id,
      subject_id,
      proficiency_level
    });

    // Validate required fields
    if (!faculty_id || !subject_id) {
      return NextResponse.json({
        success: false,
        error: 'faculty_id and subject_id are required'
      }, { status: 400 });
    }

    // Verify faculty exists
    const { data: facultyCheck, error: facultyError } = await supabase
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('id', faculty_id)
      .maybeSingle();

    if (facultyError || !facultyCheck) {
      console.error('❌ Faculty not found:', faculty_id, facultyError);
      return NextResponse.json({
        success: false,
        error: 'Selected faculty not found in database'
      }, { status: 404 });
    }

    // Verify subject exists
    const { data: subjectCheck, error: subjectError } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('id', subject_id)
      .maybeSingle();

    if (subjectError || !subjectCheck) {
      console.error('❌ Subject not found:', subject_id, subjectError);
      return NextResponse.json({
        success: false,
        error: 'Selected subject not found in database'
      }, { status: 404 });
    }

    console.log('✅ Validation passed - Faculty:', facultyCheck.first_name, facultyCheck.last_name, '| Subject:', subjectCheck.name);

    // Check if qualification already exists
    const { data: existing } = await supabase
      .from('faculty_qualified_subjects')
      .select('id')
      .eq('faculty_id', faculty_id)
      .eq('subject_id', subject_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: false,
        error: 'This faculty is already qualified for this subject'
      }, { status: 409 });
    }

    // Insert new qualification
    const { data, error } = await supabase
      .from('faculty_qualified_subjects')
      .insert({
        faculty_id,
        subject_id,
        proficiency_level,
        preference_score,
        teaching_load_weight,
        is_primary_teacher,
        can_handle_lab,
        can_handle_tutorial
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding qualification:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false,
        error: 'Failed to add qualification',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }

    // Fetch the complete record with relations
    const { data: completeData } = await supabase
      .from('faculty_qualified_subjects')
      .select(`
        *,
        faculty:users(
          id,
          first_name,
          last_name,
          email
        ),
        subject:subjects(
          id,
          name,
          code,
          semester
        )
      `)
      .eq('id', data.id)
      .single();

    console.log('✅ Qualification added successfully');

    return NextResponse.json({
      success: true,
      qualification: completeData || data
    });

  } catch (error: any) {
    console.error('❌ Exception in POST /api/faculty/qualifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// DELETE: Remove faculty-subject qualification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Qualification ID is required'
      }, { status: 400 });
    }

    console.log('📥 Deleting qualification:', id);

    const { error } = await supabase
      .from('faculty_qualified_subjects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting qualification:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to delete qualification',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Qualification deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Qualification deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Exception in DELETE /api/faculty/qualifications:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
