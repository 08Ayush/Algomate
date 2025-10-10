import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch all faculty qualifications or by faculty_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('faculty_id');
    const departmentId = searchParams.get('department_id');

    console.log('📥 Fetching faculty qualifications:', { facultyId, departmentId });

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
          department_id
        ),
        subject:subjects(
          id,
          name,
          code,
          subject_type,
          semester,
          credits_per_week,
          requires_lab,
          department_id
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

    // Filter by department if specified (post-query filtering since we can't filter on nested fields directly)
    let filteredData = data || [];
    if (departmentId) {
      filteredData = filteredData.filter(qual => {
        const faculty = Array.isArray(qual.faculty) ? qual.faculty[0] : qual.faculty;
        const subject = Array.isArray(qual.subject) ? qual.subject[0] : qual.subject;
        return faculty?.department_id === departmentId && 
               subject?.department_id === departmentId;
      });
      console.log(`🔍 Filtered to ${filteredData.length} qualifications for department ${departmentId}`);
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
      .select(`
        *,
        faculty:users!faculty_qualified_subjects_faculty_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        subject:subjects!faculty_qualified_subjects_subject_id_fkey(
          id,
          name,
          code,
          semester
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error adding qualification:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to add qualification',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ Qualification added successfully');

    return NextResponse.json({
      success: true,
      qualification: data
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
