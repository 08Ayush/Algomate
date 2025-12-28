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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Only college admin can promote batches
    if (user.role !== 'college_admin') {
      return NextResponse.json(
        { success: false, error: 'Only college admins can promote batches.' },
        { status: 403 }
      );
    }

    const batchId = params.id;

    console.log('📈 Promoting batch to next semester:', batchId);

    // Fetch current batch details
    const { data: batch, error: fetchError } = await supabase
      .from('batches')
      .select('*, departments(code)')
      .eq('id', batchId)
      .single();

    if (fetchError || !batch) {
      console.error('❌ Error fetching batch:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Batch not found' },
        { status: 404 }
      );
    }

    const currentSemester = batch.semester;
    const currentYear = batch.academic_year; // e.g., "2025-26"

    // Calculate next semester
    let nextSemester = currentSemester + 1;
    if (nextSemester > 8) {
      return NextResponse.json(
        { success: false, error: 'Batch has completed all semesters (Sem 8)' },
        { status: 400 }
      );
    }

    // Calculate next academic year
    let nextAcademicYear = currentYear;
    
    // If moving from odd semester (1,3,5,7) to even semester (2,4,6,8), keep same academic year
    // If moving from even semester (2,4,6,8) to odd semester (3,5,7), increment academic year
    if (currentSemester % 2 === 0) {
      // Moving from even to odd semester means new academic year
      const [startYear] = currentYear.split('-');
      const nextStartYear = parseInt(startYear) + 1;
      const nextEndYear = (nextStartYear + 1) % 100; // Last 2 digits
      nextAcademicYear = `${nextStartYear}-${nextEndYear.toString().padStart(2, '0')}`;
    }

    // Update batch name
    const departmentCode = (batch.departments as any)?.code || 'DEPT';
    const newName = `${departmentCode} Batch ${batch.batch_year || batch.admission_year} - Sem ${nextSemester} (${nextAcademicYear})`;

    // Update the batch
    const { error: updateError } = await supabase
      .from('batches')
      .update({
        semester: nextSemester,
        academic_year: nextAcademicYear,
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    if (updateError) {
      console.error('❌ Error updating batch:', updateError);
      return NextResponse.json(
        { success: false, error: `Failed to promote batch: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Batch promoted successfully:', {
      from: `Sem ${currentSemester} (${currentYear})`,
      to: `Sem ${nextSemester} (${nextAcademicYear})`
    });

    return NextResponse.json({
      success: true,
      message: `Batch promoted from Semester ${currentSemester} to Semester ${nextSemester}`,
      data: {
        previousSemester: currentSemester,
        newSemester: nextSemester,
        previousYear: currentYear,
        newYear: nextAcademicYear
      }
    });

  } catch (error) {
    console.error('Unexpected error promoting batch:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
