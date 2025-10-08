import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user details with department information from new schema
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        college_uid,
        email,
        phone,
        profile_image_url,
        department_id,
        role,
        faculty_type,
        max_hours_per_day,
        max_hours_per_week,
        min_hours_per_week,
        faculty_priority,
        algorithm_weight,
        preferred_days,
        avoid_days,
        preferred_time_start,
        preferred_time_end,
        unavailable_slots,
        is_shared_faculty,
        is_guest_faculty,
        is_active,
        email_verified,
        last_login,
        created_at,
        updated_at,
        departments (
          id,
          name,
          code,
          description
        )
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is faculty
    if (user.role !== 'faculty') {
      return NextResponse.json({ error: 'User is not a faculty member' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user,
      department: user.departments,
      facultyRole: user.faculty_type
    });

  } catch (error) {
    console.error('Error fetching faculty profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}