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
    const startTime = Date.now();

    console.log(`🔍 Looking up user with college_uid: ${collegeUid}`);

    // ⚡ OPTIMIZED: Single query with JOINs to get user, department, and college in ONE round-trip
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
        departments:department_id (
          id,
          name,
          code
        ),
        colleges:college_id (
          id,
          name,
          code
        )
      `)
      .eq('college_uid', collegeUid)
      .eq('is_active', true)
      .maybeSingle();

    console.log(`⏱️  Query took: ${Date.now() - startTime}ms`);

    if (userError) {
      console.error('❌ Database error:', userError.message);
      return NextResponse.json(
        { error: 'Invalid College UID or password' },
        { status: 401 }
      );
    }

    if (!userData || !userData.password_hash) {
      console.error('❌ User not found or inactive');
      return NextResponse.json(
        { error: 'Invalid College UID or password' },
        { status: 401 }
      );
    }

    console.log(`✅ User found: ${userData.id}`);

    // Check password
    const passwordStartTime = Date.now();
    const isValidPassword = await bcrypt.compare(password, userData.password_hash);
    console.log(`⏱️  Password check took: ${Date.now() - passwordStartTime}ms`);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid College UID or password' },
        { status: 401 }
      );
    }

    // ⚡ OPTIMIZED: Update last login without waiting (fire and forget)
    supabaseAdmin
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id)
      .then(({ error }) => {
        if (error) {
          console.warn('⚠️  Failed to update last login:', error.message);
        } else {
          console.log('✅ Last login updated');
        }
      });

    // ✅ Set session context for subsequent queries (improves RLS policy performance)
    const contextStartTime = Date.now();
    try {
      const { error: contextError } = await supabaseAdmin.rpc('set_user_context', {
        p_user_id: userData.id,
        p_college_id: userData.college_id,
        p_role: userData.role,
        p_department_id: userData.department_id || null
      });

      console.log(`⏱️  Session context took: ${Date.now() - contextStartTime}ms`);

      if (contextError) {
        console.warn('⚠️  Failed to set session context:', contextError.message);
      }
    } catch (sessionError) {
      console.warn('⚠️  Session context error:', sessionError);
    }

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
      department: deptResult.data,
      college: collegeResult.data
    };

    console.log(`⚡ Total login time: ${Date.now() - startTime}ms`);

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