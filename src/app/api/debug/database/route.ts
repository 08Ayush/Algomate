import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/shared/database/client';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    // Get all users (without passwords for security)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, created_at');

    // Get all students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*');

    // Get all faculty
    const { data: faculty, error: facultyError } = await supabase
      .from('faculty')
      .select('*');

    // Get all departments
    const { data: departments, error: departmentsError } = await supabase
      .from('departments')
      .select('*');

    return NextResponse.json({
      users: {
        data: users || [],
        error: usersError?.message || null,
        count: users?.length || 0
      },
      students: {
        data: students || [],
        error: studentsError?.message || null,
        count: students?.length || 0
      },
      faculty: {
        data: faculty || [],
        error: facultyError?.message || null,
        count: faculty?.length || 0
      },
      departments: {
        data: departments || [],
        error: departmentsError?.message || null,
        count: departments?.length || 0
      }
    });

  } catch (error: any) {
    console.error('Database status error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Failed to get database status' },
      { status: 500 }
    );
  }
}