import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

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

export async function POST(request: NextRequest) {
  try {
    const { collegeUid, password, firstName, lastName, department_id, role, faculty_type } = await request.json();

    // Validate required fields
    if (!collegeUid || !password || !firstName || !lastName || !department_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate role - only student and faculty allowed
    if (role !== 'student' && role !== 'faculty') {
      return NextResponse.json(
        { error: 'Invalid role. Only student and faculty roles are allowed.' },
        { status: 400 }
      );
    }

    // Validate faculty_type for faculty users
    if (role === 'faculty' && !faculty_type) {
      return NextResponse.json(
        { error: 'Faculty type is required for faculty users' },
        { status: 400 }
      );
    }

    // Validate College UID format
    if (!/^[A-Z0-9-]+$/i.test(collegeUid)) {
      return NextResponse.json(
        { error: 'Invalid College UID format' },
        { status: 400 }
      );
    }

    // Get college_id from the selected department
    const { data: departmentData, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('college_id')
      .eq('id', department_id)
      .single();

    if (deptError || !departmentData) {
      return NextResponse.json(
        { error: 'Invalid department selected' },
        { status: 400 }
      );
    }

    const college_id = departmentData.college_id;

    // Check if College UID already exists in this college
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('college_uid', collegeUid)
      .eq('college_id', college_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'College UID already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Prepare user data based on role
    const userData: any = {
      first_name: firstName,
      last_name: lastName,
      college_uid: collegeUid,
      email: `${collegeUid}@college.internal`, // Generate a placeholder email
      password_hash: hashedPassword,
      college_id: college_id, // Add college_id from department
      department_id,
      role,
      is_active: true,
      email_verified: false
    };

    // Add role-specific fields
    if (role === 'faculty') {
      userData.faculty_type = faculty_type;
    } else if (role === 'student') {
      // For students, use college_uid as student_id and set default values
      userData.student_id = collegeUid;
      userData.admission_year = new Date().getFullYear();
      userData.current_semester = 1; // Default to first semester
    }

    // Create user in users table with new schema
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select(`
        id,
        first_name,
        last_name,
        college_uid,
        role,
        faculty_type,
        created_at
      `)
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      if (userError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'College UID already exists' },
          { status: 409 }
        );
      }
      throw userError;
    }

    // Return success without sensitive data
    return NextResponse.json({
      message: 'User registered successfully',
      user: userRecord
    });

  } catch (error: any) {
    console.error('Registration API error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}