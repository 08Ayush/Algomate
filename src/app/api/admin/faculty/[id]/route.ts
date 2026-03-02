import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

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

    const { data: dbUser, error } = await supabase
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

// PUT - Update faculty
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
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

    // Map creator/publisher role to faculty role with appropriate faculty_type
    let actualRole = role;
    let actualFacultyType = faculty_type || 'general';

    if (role === 'creator' || role === 'publisher') {
      actualRole = 'faculty';
      actualFacultyType = role;
    }

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

    // Check if faculty exists and belongs to user's college
    const { data: existingFaculty } = await supabase
      .from('users')
      .select('id, role, college_id')
      .eq('id', id)
      .eq('college_id', user.college_id)
      .in('role', ['admin', 'faculty'])
      .single();

    if (!existingFaculty) {
      return NextResponse.json(
        { error: 'Faculty not found in your college' },
        { status: 404 }
      );
    }

    // Check if email is taken by another user
    const { data: conflictUser } = await supabase
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

    // Check if department exists and belongs to user's college
    const { data: department } = await supabase
      .from('departments')
      .select('id, college_id')
      .eq('id', department_id)
      .eq('college_id', user.college_id)
      .single();

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found in your college' },
        { status: 400 }
      );
    }

    // Update faculty
    const { data: updatedFaculty, error } = await supabase
      .from('users')
      .update({
        first_name,
        last_name,
        email,
        phone: phone || null,
        role: actualRole,
        faculty_type: actualFacultyType,
        department_id,
        college_id: user.college_id,  // Maintain user's college_id
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', id)
      .eq('college_id', user.college_id)
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

    // Map faculty_type back to role for display (reverse the mapping)
    const displayFaculty = {
      ...updatedFaculty,
      role: (updatedFaculty.role === 'faculty' &&
        (updatedFaculty.faculty_type === 'creator' || updatedFaculty.faculty_type === 'publisher'))
        ? updatedFaculty.faculty_type
        : updatedFaculty.role
    };

    return NextResponse.json({
      message: 'Faculty updated successfully',
      faculty: displayFaculty
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Check if faculty exists and belongs to user's college
    const { data: existingFaculty } = await supabase
      .from('users')
      .select('id, first_name, last_name, role, college_id')
      .eq('id', id)
      .eq('college_id', user.college_id)
      .in('role', ['admin', 'faculty'])
      .single();

    if (!existingFaculty) {
      return NextResponse.json(
        { error: 'Faculty not found in your college' },
        { status: 404 }
      );
    }

    // Check if this is the last admin
    if (existingFaculty.role === 'admin') {
      const { data: adminCount, error: countError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .eq('college_id', user.college_id)
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

    // Check if faculty has dependencies
    const dependencies: string[] = [];

    // Check scheduled_classes (has ON DELETE RESTRICT)
    const { data: scheduledClasses, error: scheduledError } = await supabase
      .from('scheduled_classes')
      .select('id')
      .eq('faculty_id', id)
      .limit(1);

    if (scheduledClasses && scheduledClasses.length > 0) {
      dependencies.push('scheduled classes');
    }

    // Check batch_subjects (assigned_faculty_id)
    const { data: batchSubjects, error: batchSubjectsError } = await supabase
      .from('batch_subjects')
      .select('id')
      .eq('assigned_faculty_id', id)
      .limit(1);

    if (batchSubjects && batchSubjects.length > 0) {
      dependencies.push('batch subject assignments');
    }

    // Check if faculty is HOD of any department
    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id')
      .eq('head_of_department', id)
      .limit(1);

    if (departments && departments.length > 0) {
      dependencies.push('head of department role');
    }

    // Check if faculty is class coordinator
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id')
      .eq('class_coordinator', id)
      .limit(1);

    if (batches && batches.length > 0) {
      dependencies.push('class coordinator role');
    }

    // If there are any dependencies, return error with details
    if (dependencies.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete faculty. This faculty has active ${dependencies.join(', ')}. Please remove these assignments first.`
        },
        { status: 400 }
      );
    }

    // Delete faculty - CASCADE will handle:
    // - faculty_qualified_subjects
    // - faculty_availability
    // - notifications (sender_id will be SET NULL)
    // - student_enrollments (if any)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('college_id', user.college_id);

    if (error) {
      console.error('Faculty deletion error:', error);
      return NextResponse.json(
        { error: `Failed to delete faculty: ${error.message}` },
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