import { serviceDb as supabase } from '@/shared/database';
import { getPool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

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

    // Get bucket's max_selection limit via raw SQL
    const pool = getPool();
    const bucketRes = await pool.query(
      'SELECT max_selection FROM elective_buckets WHERE id = $1',
      [bucketId]
    );
    const maxSelection = bucketRes.rows[0]?.max_selection || 1;

    // Fetch allotted choices with user + subject JOINs (raw SQL to avoid Neon compat shim stripping relations)
    const { rows: allotments, rowCount } = await pool.query(
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
         s.code AS subject_code,
         s.name AS subject_name
       FROM student_subject_choices ssc
       LEFT JOIN users u ON u.id = ssc.student_id
       LEFT JOIN subjects s ON s.id = ssc.subject_id
       WHERE ssc.bucket_id = $1
         AND (ssc.is_allotted = true OR ssc.allotment_status = 'allotted')
       ORDER BY ssc.priority ASC`,
      [bucketId]
    );

    if (rowCount === null) {
      console.error('Error fetching allotments');
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
      first_name: a.first_name || '',
      last_name: a.last_name || '',
      college_uid: a.college_uid || '',
      subject_code: a.subject_code || '',
      subject_name: a.subject_name || '',
      priority_rank: a.priority || 0,
      student_cgpa: a.cgpa || 0,
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

    // Get the bucket's max_selection limit via raw SQL
    const pool = getPool();
    const bucketPostRes = await pool.query(
      'SELECT max_selection FROM elective_buckets WHERE id = $1',
      [bucket_id]
    );
    const maxSelection = bucketPostRes.rows[0]?.max_selection || 1;

    // Get pending student choices with user CGPA via raw SQL (Neon compat shim strips relation syntax)
    const { rows: choices } = await pool.query(
      `SELECT
         ssc.id,
         ssc.student_id,
         ssc.subject_id,
         ssc.bucket_id,
         ssc.priority,
         ssc.is_allotted,
         ssc.allotment_status,
         u.cgpa
       FROM student_subject_choices ssc
       LEFT JOIN users u ON u.id = ssc.student_id
       WHERE ssc.bucket_id = $1
         AND ssc.is_allotted = false
         AND ssc.allotment_status != 'allotted'
       ORDER BY ssc.priority ASC`,
      [bucket_id]
    );

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

    // Sort students by CGPA (highest first) — cgpa is now a direct column from the SQL join
    const sortedStudents = Array.from(studentChoices.entries()).sort((a, b) => {
      const cgpaA = Number(a[1][0]?.cgpa) || 0;
      const cgpaB = Number(b[1][0]?.cgpa) || 0;
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
        const { rowCount: updateCount } = await pool.query(
          `UPDATE student_subject_choices
           SET is_allotted = true, allotment_status = 'allotted', updated_at = NOW()
           WHERE id = $1`,
          [choice.id]
        );
        if (updateCount && updateCount > 0) {
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
