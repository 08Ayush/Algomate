import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Get authenticated user from token
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const userString = Buffer.from(token, 'base64').toString();
    const user = JSON.parse(userString);
    
    // Verify user exists and is active
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('id, department_id, college_id, role, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();

    if (error || !dbUser) {
      return null;
    }

    return dbUser;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Only college admin can create batches
    if (user.role !== 'college_admin') {
      return NextResponse.json(
        { success: false, error: 'Only college admins can create batches.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      department_id,
      course_id,
      semester,
      academic_year,
      admission_year,
      section,
      expected_strength,
      actual_strength
    } = body;

    console.log('📚 Creating new batch:', body);

    // Fetch department code for batch name
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('code')
      .eq('id', department_id)
      .single();

    if (deptError || !department) {
      console.error('❌ Error fetching department:', deptError);
      return NextResponse.json(
        { success: false, error: 'Department not found' },
        { status: 404 }
      );
    }

    // Calculate batch_year from admission_year if not provided
    const batchYear = admission_year || new Date().getFullYear();

    // Generate batch name: "CSE Batch 2025 - Sem 1 (2025-26)"
    const batchName = `${department.code} Batch ${batchYear} - Sem ${semester} (${academic_year})`;

    // Create the batch
    const { data: batch, error: createError } = await supabase
      .from('batches')
      .insert({
        name: batchName,
        college_id: user.college_id,
        department_id,
        course_id,
        semester,
        academic_year,
        admission_year: batchYear,
        batch_year: batchYear.toString(),
        section: section || 'A',
        expected_strength: expected_strength || 60,
        actual_strength: actual_strength || 0,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating batch:', createError);
      return NextResponse.json(
        { success: false, error: `Failed to create batch: ${createError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Batch created successfully:', batch.id);

    return NextResponse.json({
      success: true,
      message: 'Batch created successfully!',
      batch
    });

  } catch (error) {
    console.error('Unexpected error creating batch:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
