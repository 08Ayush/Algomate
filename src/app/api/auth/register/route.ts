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
    const { email, password, firstName, lastName, department_id, role, faculty_type } = await request.json();

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !department_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Generate unique college UID (you can customize this logic)
    const college_uid = `${role.toUpperCase().substring(0, 3)}${Date.now().toString().slice(-6)}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in users table with new schema
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        first_name: firstName,
        last_name: lastName,
        college_uid,
        email,
        password_hash: hashedPassword,
        department_id,
        role,
        faculty_type: role === 'faculty' ? faculty_type : null,
        is_active: true,
        email_verified: false
      })
      .select(`
        id,
        first_name,
        last_name,
        college_uid,
        email,
        role,
        faculty_type,
        created_at
      `)
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      if (userError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Email or College UID already exists' },
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