import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
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

    // Fetch students with their course information
    const { data: students, error } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        phone,
        student_id,
        course_id,
        current_semester,
        admission_year,
        is_active,
        created_at,
        courses (
          id,
          title,
          code
        )
      `)
      .eq('college_id', decodedUser.college_id)
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    return NextResponse.json({ students: students || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { first_name, last_name, email, student_id, phone, current_semester, admission_year, course_id, is_active } = body;

    if (!first_name || !last_name || !email || !course_id) {
      return NextResponse.json({ error: 'Missing required fields (first_name, last_name, email, course_id)' }, { status: 400 });
    }

    const supabase = createClient();

    // Generate college UID (e.g., STUDENT2024001)
    const { data: existingStudents } = await supabase
      .from('users')
      .select('college_uid')
      .eq('college_id', decodedUser.college_id)
      .eq('role', 'student')
      .order('college_uid', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (existingStudents && existingStudents.length > 0) {
      const lastUid = existingStudents[0].college_uid;
      const match = lastUid.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }

    const college_uid = `STUDENT${admission_year}${String(nextNumber).padStart(3, '0')}`;

    // Generate a default password hash (students don't use login, but schema requires it)
    const defaultPasswordHash = await bcrypt.hash('student123', 10);

    // Insert new student
    const { data: newStudent, error } = await supabase
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        password_hash: defaultPasswordHash,
        college_uid,
        student_id: student_id || null,
        phone: phone || null,
        current_semester: current_semester || 1,
        admission_year: admission_year || new Date().getFullYear(),
        course_id: course_id || null,
        role: 'student',
        college_id: decodedUser.college_id,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create student' }, { status: 500 });
    }

    return NextResponse.json({ student: newStudent }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
