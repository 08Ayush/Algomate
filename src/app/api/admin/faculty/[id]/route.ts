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

// PUT - Update faculty
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const { 
      first_name, 
      last_name, 
      email, 
      phone, 
      role, 
      faculty_type, 
      department_id, 
      is_active 
    } = await request.json();

    // Validate required fields
    if (!first_name || !last_name || !email || !department_id) {
      return NextResponse.json(
        { error: 'First name, last name, email, and department are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if faculty exists
    const { data: existingFaculty } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', id)
      .in('role', ['admin', 'faculty'])
      .single();

    if (!existingFaculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    // Check if email is taken by another user
    const { data: conflictUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', id)
      .single();

    if (conflictUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if department exists and get college_id
    const { data: department } = await supabaseAdmin
      .from('departments')
      .select('id, college_id')
      .eq('id', department_id)
      .single();

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 400 }
      );
    }

    if (!department.college_id) {
      return NextResponse.json(
        { error: 'Department does not have a college_id assigned' },
        { status: 400 }
      );
    }

    // Update faculty
    const { data: updatedFaculty, error } = await supabaseAdmin
      .from('users')
      .update({
        first_name,
        last_name,
        email,
        phone: phone || null,
        role,
        faculty_type: faculty_type || 'general',
        department_id,
        college_id: department.college_id,  // Update college_id when department changes
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', id)
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        phone,
        role,
        faculty_type,
        department_id,
        college_id,
        is_active,
        departments!users_department_id_fkey(id, name, code)
      `)
      .single();

    if (error) {
      console.error('Faculty update error:', error);
      return NextResponse.json(
        { error: 'Failed to update faculty' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Faculty updated successfully',
      faculty: updatedFaculty
    });

  } catch (error: any) {
    console.error('Faculty update API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete faculty
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if faculty exists
    const { data: existingFaculty } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('id', id)
      .in('role', ['admin', 'faculty'])
      .single();

    if (!existingFaculty) {
      return NextResponse.json(
        { error: 'Faculty not found' },
        { status: 404 }
      );
    }

    // Check if this is the last admin
    if (existingFaculty.role === 'admin') {
      const { data: adminCount, error: countError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('is_active', true);

      if (countError) {
        console.error('Admin count error:', countError);
        return NextResponse.json(
          { error: 'Failed to check admin count' },
          { status: 500 }
        );
      }

      if (adminCount && adminCount.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last active admin' },
          { status: 400 }
        );
      }
    }

    // Check if faculty has dependencies (subjects, timetables, etc.)
    // This would depend on your schema - adding basic check for subjects
    const { data: subjects, error: subjectsError } = await supabaseAdmin
      .from('subjects')
      .select('id')
      .eq('faculty_id', id)
      .limit(1);

    if (subjectsError) {
      console.error('Subjects check error:', subjectsError);
      // Continue with deletion even if check fails
    }

    if (subjects && subjects.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete faculty with assigned subjects. Please reassign subjects first.' },
        { status: 400 }
      );
    }

    // Delete faculty
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Faculty deletion error:', error);
      return NextResponse.json(
        { error: 'Failed to delete faculty' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Faculty deleted successfully'
    });

  } catch (error: any) {
    console.error('Faculty deletion API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}