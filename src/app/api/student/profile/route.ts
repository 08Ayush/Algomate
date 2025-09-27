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

    // Get department data
    const { data: department, error: departmentError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', student.department_id)
      .single();

    if (departmentError) {
      console.error('Department fetch error:', departmentError);
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    return NextResponse.json({
      student,
      department
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}