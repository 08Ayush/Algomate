import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

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
    const batchId = searchParams.get('batchId');

    if (!bucketId) {
      return NextResponse.json({ choices: [] });
    }

    // Get bucket's max_selection limit
    const { data: bucket } = await supabase
      .from('elective_buckets')
      .select('max_selection')
      .eq('id', bucketId)
      .single();

    const maxSelection = bucket?.max_selection || 1;

    // Fetch ALL choices for this bucket (we'll filter pending ones in code)
    const { data: allChoices, error } = await supabase
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
        subjects:subject_id(id, name, code),
        elective_buckets:bucket_id(id, bucket_name)
      `)
      .eq('bucket_id', bucketId)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching student choices:', error);
      return NextResponse.json({ choices: [] });
    }

    // Group by student
    const studentChoices = new Map<string, any[]>();
    (allChoices || []).forEach((c: any) => {
      const studentId = c.student_id;
      if (!studentChoices.has(studentId)) {
        studentChoices.set(studentId, []);
      }
      studentChoices.get(studentId)!.push(c);
    });

    // For each student, identify which choices are "pending" (not in the top max_selection allotted ones)
    const pendingChoices: any[] = [];

    studentChoices.forEach((choices, studentId) => {
      // Sort by priority (lower = higher priority)
      choices.sort((a, b) => (a.priority || 99) - (b.priority || 99));

      // Get allotted choices for this student
      const allottedChoices = choices.filter((c: any) =>
        c.is_allotted === true || c.allotment_status === 'allotted'
      );

      // The "valid" allotted ones are the top max_selection by priority
      const validAllottedIds = new Set(
        allottedChoices.slice(0, maxSelection).map((c: any) => c.id)
      );

      // Pending choices are either:
      // 1. Choices that are not allotted at all
      // 2. Choices that are "allotted" but exceed the max_selection limit
      choices.forEach((c: any) => {
        const isAllotted = c.is_allotted === true || c.allotment_status === 'allotted';
        const isValidAllotment = validAllottedIds.has(c.id);

        // If not allotted, or if allotted but not in valid set (exceeds limit)
        if (!isAllotted || (isAllotted && !isValidAllotment)) {
          // Only add truly pending ones (not the ones that are validly allotted)
          if (!isValidAllotment) {
            pendingChoices.push(c);
          }
        }
      });
    });

    // Map to expected format
    const mappedChoices = pendingChoices.map((c: any) => ({
      id: c.id,
      student_id: c.student_id,
      student_name: `${c.users?.first_name || ''} ${c.users?.last_name || ''}`.trim(),
      college_uid: c.users?.college_uid || '',
      cgpa: c.users?.cgpa || 0,
      priority: c.priority,
      subject_code: c.subjects?.code || '',
      subject_name: c.subjects?.name || '',
      bucket_name: c.elective_buckets?.bucket_name || '',
      created_at: c.created_at
    }));

    return NextResponse.json({ choices: mappedChoices });
  } catch (error: any) {
    console.error('Error fetching student choices:', error);
    return NextResponse.json({ choices: [] });
  }
}
