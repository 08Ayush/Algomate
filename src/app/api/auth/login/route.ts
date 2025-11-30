import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { collegeUid, password } = await request.json();

    // Validate required fields
    if (!collegeUid || !password) {
      return NextResponse.json(
        { error: 'College UID and password are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient();

    // Find user by college_uid with department info and college_id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        college_uid,
        college_id,
        email,
        password_hash,
        phone,
        profile_image_url,
        department_id,
        role,
        faculty_type,
        is_active,
        email_verified,
        last_login,
        created_at,
        departments!users_department_id_fkey(id, name, code),
        colleges!users_college_id_fkey(id, name, code)
      `)
      .eq('college_uid', collegeUid)
      .eq('is_active', true)
      .maybeSingle();

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return NextResponse.json(
        { error: 'Invalid College UID or password' },
        { status: 401 }
      );
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid College UID or password' },
        { status: 401 }
      );
    }

    // Update last login
    await supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    // Remove password from response
    const { password_hash: _, ...userWithoutPassword } = userData;

    return NextResponse.json({
      message: 'Login successful',
      userData: userWithoutPassword
    });

  } catch (error: any) {
    console.error('Login API error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}