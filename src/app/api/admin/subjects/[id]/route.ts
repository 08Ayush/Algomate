import { NextRequest, NextResponse } from 'next/server';
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

// Helper function to get user from Authorization header
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);

    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, college_id, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .in('role', ['admin', 'college_admin'])
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

// PUT - Update subject
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can update subjects.' },
        { status: 403 }
      );
    }

    const { id: subjectId } = await params;
    const body = await request.json();
    const {
      code,
      name,
      credits_per_week,
      semester,
      department_id,
      course_id,
      category,
      subject_type,
      is_active
    } = body;

    // Verify subject belongs to user's college
    const { data: existingSubject, error: fetchError } = await supabaseAdmin
      .from('subjects')
      .select('id, college_id, department_id')
      .eq('id', subjectId)
      .eq('college_id', user.college_id)
      .single();

    if (fetchError || !existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found or access denied' },
        { status: 404 }
      );
    }

    // If department is being changed, verify it belongs to user's college
    if (department_id && department_id !== existingSubject.department_id) {
      const { data: department, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('id', department_id)
        .eq('college_id', user.college_id)
        .single();

      if (deptError || !department) {
        return NextResponse.json(
          { error: 'Invalid department' },
          { status: 403 }
        );
      }
    }

    // Check for duplicate subject code (if code is being changed)
    if (code) {
      const { data: duplicate } = await supabaseAdmin
        .from('subjects')
        .select('id')
        .eq('code', code)
        .eq('department_id', department_id || existingSubject.department_id)
        .eq('college_id', user.college_id)
        .neq('id', subjectId)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { error: 'Subject code already exists in this department' },
          { status: 409 }
        );
      }
    }

    // Update the subject
    const updateData: any = {};
    if (code) updateData.code = code;
    if (name) updateData.name = name;
    if (credits_per_week) updateData.credits_per_week = credits_per_week;
    if (semester) updateData.semester = semester;
    if (department_id) updateData.department_id = department_id;
    if (course_id !== undefined) updateData.course_id = course_id && course_id.trim() !== '' ? course_id : null;
    if (category !== undefined) updateData.category = category || null;  // MAJOR, MINOR, CORE (nep_category enum)
    if (subject_type) {
      updateData.subject_type = subject_type;  // THEORY, LAB, PRACTICAL, TUTORIAL
      updateData.requires_lab = subject_type === 'LAB';
      updateData.practical_hours = (subject_type === 'LAB' || subject_type === 'PRACTICAL') ? 2 : 0;
    }
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedSubject, error: updateError } = await supabaseAdmin
      .from('subjects')
      .update(updateData)
      .eq('id', subjectId)
      .select()
      .single();

    if (updateError) {
      console.error('Subject update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subject' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subject: updatedSubject,
      message: 'Subject updated successfully'
    });

  } catch (error: any) {
    console.error('Update subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete subject
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins can delete subjects.' },
        { status: 403 }
      );
    }

    const { id: subjectId } = await params;

    // Verify subject belongs to user's college
    const { data: existingSubject, error: fetchError } = await supabaseAdmin
      .from('subjects')
      .select('id, college_id')
      .eq('id', subjectId)
      .eq('college_id', user.college_id)
      .single();

    if (fetchError || !existingSubject) {
      return NextResponse.json(
        { error: 'Subject not found or access denied' },
        { status: 404 }
      );
    }

    // Check if subject is used in any timetables or other relations
    const { data: timetableEntries } = await supabaseAdmin
      .from('timetable_entries')
      .select('id')
      .eq('subject_id', subjectId)
      .limit(1);

    if (timetableEntries && timetableEntries.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subject. It is being used in timetables.' },
        { status: 409 }
      );
    }

    // Delete the subject
    const { error: deleteError } = await supabaseAdmin
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (deleteError) {
      console.error('Subject deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete subject' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Subject deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete subject error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
