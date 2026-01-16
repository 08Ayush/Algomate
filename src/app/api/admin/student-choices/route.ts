import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/student-choices
 * Fetch student subject choices for a bucket (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get('bucketId');

    if (!bucketId) {
      return NextResponse.json({ error: 'bucketId is required' }, { status: 400 });
    }

    // Fetch student choices - show pending OR null (for new entries that don't have status set yet)
    const { data: choicesData, error } = await supabaseAdmin
      .from('student_subject_choices')
      .select(`
        id,
        student_id,
        bucket_id,
        subject_id,
        priority,
        created_at,
        updated_at,
        is_allotted,
        allotment_status,
        users:users!student_subject_choices_student_id_fkey (
          id,
          first_name,
          last_name,
          email,
          college_uid,
          credit,
          department_id
        ),
        subjects:subjects!student_subject_choices_subject_id_fkey (
          id,
          code,
          name
        )
      `)
      .eq('bucket_id', bucketId)
      .neq('allotment_status', 'allotted')
      .order('created_at', { ascending: true });

    console.log(`[Admin Student Choices] Found ${choicesData?.length || 0} choices for bucket ${bucketId}`);

    if (error) {
      console.error('[Admin Student Choices] Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch student choices' }, { status: 500 });
    }

    // Transform data for frontend
    const choices = (choicesData || []).map((choice: any) => ({
      id: choice.id,
      student_id: choice.student_id,
      student_name: `${choice.users?.first_name || ''} ${choice.users?.last_name || ''}`.trim(),
      college_uid: choice.users?.college_uid || '',
      cgpa: parseFloat(choice.users?.credit || '0'),
      priority: choice.priority,
      subject_code: choice.subjects?.code || '',
      subject_name: choice.subjects?.name || '',
      created_at: choice.created_at,
      is_allotted: choice.is_allotted,
      allotment_status: choice.allotment_status
    }));

    console.log(`[Admin Student Choices] Found ${choices.length} choices for bucket ${bucketId}`);

    return NextResponse.json({ 
      success: true,
      choices,
      count: choices.length
    });

  } catch (error) {
    console.error('[Admin Student Choices] Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
