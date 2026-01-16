import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get auth header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode the base64 token
    const token = authHeader.substring(7);
    const decodedUser = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (!decodedUser.college_id) {
      return NextResponse.json({ error: 'College ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { first_name, last_name, email, student_id, phone, password, current_semester, admission_year, course_id, department_id, is_active } = body;

    if (!first_name || !last_name || !email || !course_id || !department_id) {
      return NextResponse.json({ error: 'Missing required fields (first_name, last_name, email, course_id, department_id)' }, { status: 400 });
    }

    const supabase = createClient();

    // Prepare update data
    const updateData: any = {
      first_name,
      last_name,
      email,
      student_id: student_id || null,
      phone: phone || null,
      current_semester: current_semester || 1,
      admission_year: admission_year || new Date().getFullYear(),
      course_id: course_id || null,
      department_id: department_id || null,
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString()
    };

    // Hash new password if provided
    if (password && password.trim() !== '') {
      console.log(`Updating password for student ${id}`);
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    // Update student
    const { data: updatedStudent, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('college_id', decodedUser.college_id)
      .eq('role', 'student')
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message || 'Failed to update student' }, { status: 500 });
    }

    if (!updatedStudent) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    console.log(`Successfully updated student ${id}. Password changed: ${!!password}`);
    return NextResponse.json({ student: updatedStudent });
  } catch (error) {
    console.error('Error in PUT /api/admin/students/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get auth header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Decode the base64 token
    const token = authHeader.substring(7);
    const decodedUser = JSON.parse(Buffer.from(token, 'base64').toString());
    
    if (!decodedUser.college_id) {
      return NextResponse.json({ error: 'College ID not found' }, { status: 400 });
    }

    const supabase = createClient();

    // Delete student
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('college_id', decodedUser.college_id)
      .eq('role', 'student');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message || 'Failed to delete student' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/admin/students/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
