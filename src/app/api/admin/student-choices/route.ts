import { serviceDb as supabase } from '@/shared/database';
import { getPool } from '@/lib/db';
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

    // Get bucket's max_selection limit via raw SQL
    const pool = getPool();
    const bucketRes = await pool.query(
      'SELECT max_selection FROM elective_buckets WHERE id = $1',
      [bucketId]
    );
    const maxSelection = bucketRes.rows[0]?.max_selection || 1;

    // Fetch ALL choices for this bucket with JOINs for user + subject data
    const { rows: allChoices, rowCount } = await pool.query(
      `SELECT
         ssc.id,
         ssc.student_id,
         ssc.subject_id,
         ssc.bucket_id,
         ssc.priority,
         ssc.is_allotted,
         ssc.allotment_status,
         ssc.created_at,
         ssc.updated_at,
         u.first_name,
         u.last_name,
         u.college_uid,
         u.cgpa,
         s.id   AS subject_db_id,
         s.name AS subject_name,
         s.code AS subject_code,
         eb.bucket_name
       FROM student_subject_choices ssc
       LEFT JOIN users u ON u.id = ssc.student_id
       LEFT JOIN subjects s ON s.id = ssc.subject_id
       LEFT JOIN elective_buckets eb ON eb.id = ssc.bucket_id
       WHERE ssc.bucket_id = $1
       ORDER BY ssc.priority ASC`,
      [bucketId]
    );

    if (!rowCount && rowCount !== 0) {
      console.error('Error fetching student choices');
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
      student_name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      college_uid: c.college_uid || '',
      cgpa: c.cgpa || 0,
      priority: c.priority,
      subject_code: c.subject_code || '',
      subject_name: c.subject_name || '',
      bucket_name: c.bucket_name || '',
      created_at: c.created_at
    }));

    return NextResponse.json({ choices: mappedChoices });
  } catch (error: any) {
    console.error('Error fetching student choices:', error);
    return NextResponse.json({ choices: [] });
  }
}
