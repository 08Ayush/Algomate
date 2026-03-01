import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/shared/database/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Check if user exists in admin_users table
    const { data: user, error } = await supabase
      .from('admin_users')
      .select(`
        id,
        name,
        email,
        password_hash,
        role,
        college_id,
        is_active,
        colleges (
          id,
          name,
          code
        )
      `)
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !user) {
      console.error('User not found:', error);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate session token
    const tokenData = {
      id: user.id,
      email: user.email,
      college_id: user.college_id,
      timestamp: Date.now()
    };

    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    // Update user with new token and last login
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        token: token,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update user token:', updateError);
    }

    // Return user data and token immediately
    const responseData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        college_id: user.college_id,
        college_name: user.colleges?.[0]?.name,
        college_code: user.colleges?.[0]?.code
      },
      token,
      message: 'Login successful'
    };

    console.log('Login successful for user:', user.email);
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}