import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    // Get user profile data from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        college_uid,
        student_id,
        current_semester,
        admission_year,
        cgpa,
        course_id,
        college_id,
        department_id,
        role,
        course:courses!course_id (
          id,
          title,
          code,
          nature_of_course
        ),
        college:colleges!college_id (
          id,
          name
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get department info from batch enrollment
    let departmentInfo = null;
    let batchInfo = null;

    const { data: enrollment } = await supabase
      .from('student_batch_enrollment')
      .select(`
        batch_id,
        academic_year,
        batches (
          id,
          name,
          semester,
          section,
          academic_year,
          department_id,
          course_id,
          departments (
            id,
            name,
            code
          )
        )
      `)
      .eq('student_id', userId)
      .eq('is_active', true)
      .single();

    if (enrollment && enrollment.batches) {
      const batch = Array.isArray(enrollment.batches) ? enrollment.batches[0] : enrollment.batches;
      batchInfo = {
        id: batch.id,
        name: batch.name,
        semester: batch.semester,
        section: batch.section,
        academic_year: batch.academic_year || enrollment.academic_year
      };

      if (batch.departments) {
        const dept = Array.isArray(batch.departments) ? batch.departments[0] : batch.departments;
        departmentInfo = {
          id: dept.id,
          name: dept.name,
          code: dept.code
        };
      }
    }

    // If no department from batch, try from user's department_id
    if (!departmentInfo && profile.department_id) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('id', profile.department_id)
        .single();

      if (dept) {
        departmentInfo = dept;
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        department: departmentInfo,
        batch: batchInfo
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, first_name, last_name, phone } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (body.cgpa !== undefined) updateData.cgpa = body.cgpa;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile: data
    });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}