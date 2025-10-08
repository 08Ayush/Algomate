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

// GET - Fetch all faculty
export async function GET() {
  try {
    const { data: faculty, error } = await supabaseAdmin
      .from('users')
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
        is_active,
        departments!users_department_id_fkey(id, name, code)
      `)
      .in('role', ['admin', 'faculty'])
      .order('first_name');

    if (error) {
      console.error('Faculty fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch faculty' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      faculty: faculty || []
    });

  } catch (error: any) {
    console.error('Faculty API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new faculty
export async function POST(request: NextRequest) {
  try {
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

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if department exists
    const { data: department } = await supabaseAdmin
      .from('departments')
      .select('id, code')
      .eq('id', department_id)
      .single();

    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 400 }
      );
    }

    // Generate college UID
    const rolePrefix = role === 'admin' ? 'ADM' : 'FAC';
    const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
    const college_uid = `${rolePrefix}${randomSuffix}`;

    // Generate default password (user should change on first login)
    const defaultPassword = 'faculty123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

    // Create faculty user
    const { data: newFaculty, error } = await supabaseAdmin
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        phone: phone || null,
        college_uid,
        password_hash: passwordHash,
        role,
        faculty_type: faculty_type || 'general',
        department_id,
        is_active: is_active !== undefined ? is_active : true,
        email_verified: false
      })
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
        is_active,
        departments!users_department_id_fkey(id, name, code)
      `)
      .single();

    if (error) {
      console.error('Faculty creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create faculty' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Faculty created successfully',
      faculty: newFaculty,
      defaultPassword: defaultPassword // Include in response for admin reference
    }, { status: 201 });

  } catch (error: any) {
    console.error('Faculty creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}