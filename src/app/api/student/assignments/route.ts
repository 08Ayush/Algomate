import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ success: false, error: 'Batch ID is required' }, { status: 400 });
    }

    const pool = getPool();

    // Fetch published assignments with batch and subject info
    const assignmentsResult = await pool.query(`
      SELECT a.*,
        CASE WHEN b.id IS NOT NULL THEN json_build_object('name', b.name, 'semester', b.semester, 'section', b.section) ELSE NULL END AS batches,
        CASE WHEN s.id IS NOT NULL THEN json_build_object('name', s.name, 'code', s.code) ELSE NULL END AS subjects
      FROM assignments a
      LEFT JOIN batches b ON b.id = a.batch_id
      LEFT JOIN subjects s ON s.id = a.subject_id
      WHERE a.batch_id = $1 AND a.is_published = true
      ORDER BY a.created_at DESC
    `, [batchId]);

    if (assignmentsResult.rows.length === 0) {
      return NextResponse.json({ success: true, assignments: [] });
    }

    // Bulk-fetch submissions for this student
    const assignmentIds = assignmentsResult.rows.map((a: any) => a.id);
    const submissionsResult = await pool.query(`
      SELECT id, score, percentage, submission_status, submitted_at, assignment_id
      FROM assignment_submissions
      WHERE assignment_id = ANY($1::uuid[]) AND student_id = $2 AND submission_status = 'SUBMITTED'
    `, [assignmentIds, user.id]);

    const submissionMap = new Map(submissionsResult.rows.map((s: any) => [s.assignment_id, s]));

    const enrichedAssignments = assignmentsResult.rows.map((assignment: any) => {
      const submission = submissionMap.get(assignment.id);
      return { ...assignment, submission: submission || undefined, has_submitted: !!submission };
    });

    return NextResponse.json({ success: true, assignments: enrichedAssignments });

  } catch (error: any) {
    console.error('Error in student assignments GET:', error);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

