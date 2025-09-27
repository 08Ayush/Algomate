import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, department_id, role, batch_year } = await request.json();

    // Validate required fields
    if (!email || !password || !name || !department_id || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        role
      })
      .select()
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      if (userError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
      throw userError;
    }

    // Add to specific role table
    if (role === 'student') {
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          id: userRecord.id,
          name,
          email,
          department_id,
          batch_year: batch_year || new Date().getFullYear()
        });

      if (studentError) {
        console.error('Student creation error:', studentError);
        // Rollback user creation if student creation fails
        await supabase.from('users').delete().eq('id', userRecord.id);
        throw studentError;
      }
    } else if (role === 'faculty') {
      const { error: facultyError } = await supabase
        .from('faculty')
        .insert({
          id: userRecord.id,
          name,
          email,
          department_id
        });

      if (facultyError) {
        console.error('Faculty creation error:', facultyError);
        // Rollback user creation if faculty creation fails
        await supabase.from('users').delete().eq('id', userRecord.id);
        throw facultyError;
      }
    }

    // Return success without sensitive data
    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role
      }
    });

  } catch (error: any) {
    console.error('Registration API error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}