import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.error('User lookup error:', userError);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get role-specific data
    let roleData = null;
    if (userData.role === 'student') {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', userData.id)
        .single();
      roleData = { students: studentData ? [studentData] : [] };
    } else if (userData.role === 'faculty') {
      const { data: facultyData } = await supabase
        .from('faculty')
        .select('*')
        .eq('id', userData.id)
        .single();
      roleData = { faculty: facultyData ? [facultyData] : [] };
    }

    // Remove password from response and add role data
    const { password: _, ...userWithoutPassword } = { ...userData, ...roleData };

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