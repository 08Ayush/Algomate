import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch allotments (choices with is_allotted=true) for a bucket
export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const allowedRoles = ['college_admin', 'admin', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bucketId = searchParams.get('bucketId');

    if (!bucketId) {
      return NextResponse.json({ error: 'Bucket ID is required' }, { status: 400 });
    }

    // Get bucket's max_selection limit
    const { data: bucket } = await supabase
      .from('elective_buckets')
      .select('max_selection')
      .eq('id', bucketId)
      .single();

    const maxSelection = bucket?.max_selection || 1;

    // Fetch allotted choices for this bucket (is_allotted = true OR allotment_status = 'allotted')
    const { data: allotments, error } = await supabase
      .from('student_subject_choices')
      .select(`
        id,
        student_id,
        subject_id,
        bucket_id,
        priority,
        is_allotted,
        allotment_status,
        created_at,
        updated_at,
        users:student_id(id, first_name, last_name, college_uid, cgpa),
        subjects:subject_id(id, code, name)
      `)
      .eq('bucket_id', bucketId)
      .or('is_allotted.eq.true,allotment_status.eq.allotted')
      .order('priority', { ascending: true }); // Sort by priority (lower = higher priority)

    if (error) {
      console.error('Error fetching allotments:', error);
      return NextResponse.json({ allotments: [] });
    }

    // Group by student and only keep up to max_selection per student
    const studentAllotments = new Map<string, any[]>();
    (allotments || []).forEach((a: any) => {
      const studentId = a.student_id;
      if (!studentAllotments.has(studentId)) {
        studentAllotments.set(studentId, []);
      }
      const studentList = studentAllotments.get(studentId)!;
      // Only add if under max_selection limit
      if (studentList.length < maxSelection) {
        studentList.push(a);
      }
    });

    // Flatten back to array
    const filteredAllotments: any[] = [];
    studentAllotments.forEach((list) => {
      filteredAllotments.push(...list);
    });

    // Map the data to expected format
    const mappedAllotments = filteredAllotments.map((a: any) => ({
      id: a.id,
      student_id: a.student_id,
      first_name: a.users?.first_name || '',
      last_name: a.users?.last_name || '',
      college_uid: a.users?.college_uid || '',
      subject_code: a.subjects?.code || '',
      subject_name: a.subjects?.name || '',
      priority_rank: a.priority || 0,
      student_cgpa: a.users?.cgpa || 0,
      allotted_at: a.updated_at || a.created_at
    }));

    return NextResponse.json({ allotments: mappedAllotments });
  } catch (error: any) {
    console.error('Error fetching allotments:', error);
    return NextResponse.json({ allotments: [] });
  }
}

// POST - Run allotment algorithm (mark top choices as allotted)
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user; // Auth failed

    const allowedRoles = ['college_admin', 'admin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { bucket_id } = body;

    if (!bucket_id) {
      return NextResponse.json({ error: 'Bucket ID is required' }, { status: 400 });
    }

    // Get the bucket's max_selection limit
    const { data: bucket, error: bucketError } = await supabase
      .from('elective_buckets')
      .select('max_selection')
      .eq('id', bucket_id)
      .single();

    const maxSelection = bucket?.max_selection || 1;

    // Get pending student choices for this bucket (not yet allotted)
    const { data: choices, error: choicesError } = await supabase
      .from('student_subject_choices')
      .select(`
        id,
        student_id,
        subject_id,
        bucket_id,
        priority,
        is_allotted,
        allotment_status,
        users:student_id(id, first_name, last_name, college_uid, cgpa)
      `)
      .eq('bucket_id', bucket_id)
      .eq('is_allotted', false)
      .neq('allotment_status', 'allotted')
      .order('priority', { ascending: true });

    if (choicesError) {
      console.error('Error fetching choices:', choicesError);
      return NextResponse.json({ error: 'Failed to fetch student choices' }, { status: 500 });
    }

    if (!choices || choices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending choices to process',
        stats: { allotted: 0 }
      });
    }

    // Group choices by student
    const studentChoices = new Map<string, any[]>();
    choices.forEach((choice: any) => {
      const studentId = choice.student_id;
      if (!studentChoices.has(studentId)) {
        studentChoices.set(studentId, []);
      }
      studentChoices.get(studentId)!.push(choice);
    });

    // Sort students by CGPA (highest first)
    const sortedStudents = Array.from(studentChoices.entries()).sort((a, b) => {
      const cgpaA = a[1][0]?.users?.cgpa || 0;
      const cgpaB = b[1][0]?.users?.cgpa || 0;
      return cgpaB - cgpaA;
    });

    // Track allotted students
    let allottedCount = 0;

    for (const [studentId, studentChoiceList] of sortedStudents) {
      // Sort by priority (lower = higher priority)
      const sortedByPriority = studentChoiceList.sort((a, b) => (a.priority || 99) - (b.priority || 99));

      // Allot up to maxSelection subjects per student
      const toAllot = sortedByPriority.slice(0, maxSelection);

      for (const choice of toAllot) {
        // Update the choice to mark as allotted
        const { error: updateError } = await supabase
          .from('student_subject_choices')
          .update({
            is_allotted: true,
            allotment_status: 'allotted',
            updated_at: new Date().toISOString()
          })
          .eq('id', choice.id);

        if (!updateError) {
          allottedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully allotted ${allottedCount} subjects to ${studentChoices.size} students`,
      stats: {
        allotted: allottedCount,
        students: studentChoices.size
      }
    });
  } catch (error: any) {
    console.error('Error running allotment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
