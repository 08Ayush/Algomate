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

    // First, quickly fetch just the user credentials (no joins for speed)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, college_uid, college_id, email, password_hash, department_id, role, faculty_type, is_active')
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

    // Update last login asynchronously (don't wait for it)
    supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id)
      .then(() => console.log('Last login updated'))
      .catch((err) => console.error('Failed to update last login:', err));

    // Fetch department and college data in parallel (only after auth succeeds)
    const [deptResult, collegeResult] = await Promise.all([
      userData.department_id 
        ? supabaseAdmin.from('departments').select('id, name, code').eq('id', userData.department_id).single()
        : Promise.resolve({ data: null, error: null }),
      userData.college_id
        ? supabaseAdmin.from('colleges').select('id, name, code').eq('id', userData.college_id).single()
        : Promise.resolve({ data: null, error: null })
    ]);

    // Remove password from response and add department/college data
    const { password_hash: _, ...userWithoutPassword } = userData;
    
    const enrichedUserData = {
      ...userWithoutPassword,
      departments: deptResult.data,
      colleges: collegeResult.data
    };

    return NextResponse.json({
      message: 'Login successful',
      userData: enrichedUserData
    });

  } catch (error: any) {
    console.error('Login API error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    );
  }
}