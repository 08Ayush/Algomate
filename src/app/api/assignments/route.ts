import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';
import { notifyAssignmentCreated } from '@/lib/notificationService';
import { getPool } from '@/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper function to decode and verify user from token

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      type,
      batchId,
      subjectId,
      totalMarks,
      passingMarks,
      durationMinutes,
      scheduledStart,
      scheduledEnd,
      maxAttempts,
      proctoringEnabled,
      maxViolations,
      showResultsImmediately,
      allowReview,
      questions,
      isDraft,
      notifyStudents = true // New option to control notifications
    } = body;

    // Validate required fields
    if (!title || !batchId || !totalMarks || !questions || questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Step 1: Insert assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        college_id: user.college_id,
        subject_id: subjectId || null,
        batch_id: batchId,
        created_by: user.id,
        title,
        description,
        type,
        status: isDraft ? 'DRAFT' : 'SCHEDULED',
        instructions: '',
        total_marks: parseFloat(totalMarks),
        passing_marks: passingMarks ? parseFloat(passingMarks) : null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        scheduled_start: scheduledStart || null,
        scheduled_end: scheduledEnd || null,
        max_attempts: maxAttempts ? parseInt(maxAttempts) : 1,
        proctoring_enabled: proctoringEnabled || false,
        max_violations: maxViolations ? parseInt(maxViolations) : 3,
        show_results_immediately: showResultsImmediately || false,
        allow_review: allowReview || false,
        is_published: !isDraft,
      })
      .select('id')
      .single();

    if (assignmentError) {
      console.error('Assignment creation error:', assignmentError);
      return NextResponse.json(
        { success: false, error: 'Failed to create assignment: ' + assignmentError.message },
        { status: 500 }
      );
    }

    // Step 2: Insert questions
    const questionsToInsert = questions.map((q: any, index: number) => ({
      assignment_id: assignment.id,
      question_order: index + 1,
      question_text: q.question_text,
      question_type: q.question_type,
      marks: parseFloat(q.marks),
      negative_marking: q.negative_marking ? parseFloat(q.negative_marking) : 0,
      question_data: q.question_data || {},
    }));

    const { error: questionsError } = await supabase
      .from('assignment_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Questions insert error:', questionsError);
      // Rollback: Delete the assignment
      await supabase.from('assignments').delete().eq('id', assignment.id);
      return NextResponse.json(
        { success: false, error: 'Failed to create questions: ' + questionsError.message },
        { status: 500 }
      );
    }

    // Step 3: Get student count + subject name + initialize analytics in parallel
    const [{ count: studentCount }, subjectResult] = await Promise.all([
      supabase
        .from('student_batch_enrollment')
        .select('id', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .eq('is_active', true),
      subjectId
        ? supabase.from('subjects').select('name').eq('id', subjectId).single()
        : Promise.resolve({ data: null })
    ]);

    // Initialize analytics (non-blocking, don't await error)
    supabase
      .from('assignment_analytics')
      .insert({
        assignment_id: assignment.id,
        total_students: studentCount || 0,
        total_submissions: 0,
        avg_score: 0,
        highest_score: 0,
        lowest_score: 0,
        avg_time_taken: 0,
      })
      .then(({ error: analyticsError }: { error: any }) => {
        if (analyticsError) console.error('Analytics initialization error:', analyticsError);
      });

    // Fetch subject name if available
    let subjectName = 'General';
    if (subjectId) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', subjectId)
        .single();
      subjectName = subject?.name || 'General';
    }

    // Step 4: Send notifications to students (if published and notifyStudents is true)
    if (!isDraft && notifyStudents && scheduledEnd) {
      const creatorName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Faculty';
      const subjectName = subjectResult?.data?.name || 'General';

      await notifyAssignmentCreated({
        assignmentId: assignment.id,
        assignmentTitle: title,
        batchId: batchId,
        subjectName,
        dueDate: new Date(scheduledEnd),
        creatorId: user.id,
        creatorName,
        notifyStudents: true
      });

      console.log('✅ Assignment notification sent to students');
    }

    return NextResponse.json({
      success: true,
      assignment_id: assignment.id,
      message: isDraft ? 'Assignment saved as draft' : 'Assignment created successfully',
      notificationsSent: !isDraft && notifyStudents
    });

  } catch (error: any) {
    console.error('Assignment creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { page, limit, isPaginated } = getPaginationParams(request);
    const pool = await getPool();

    // Build raw SQL with JOINs so batch/subject/user names are always populated
    const params: unknown[] = [user.college_id];
    let whereClauses = `a.college_id = $1`;

    if (user.role === 'faculty') {
      params.push(user.id);
      whereClauses += ` AND a.created_by = $${params.length}`;
    }

    // Count query
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM assignments a WHERE ${whereClauses}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    // Data query with pagination
    let paginationSql = '';
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      params.push(to - from + 1, from); // LIMIT, OFFSET
      paginationSql = ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
    } else {
      params.push(500);
      paginationSql = ` LIMIT $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT
        a.*,
        a.scheduled_end AS due_date,
        (a.status = 'DRAFT') AS is_draft,
        b.id   AS batch_id_ref,
        b.name AS batch_name,
        b.semester,
        b.section,
        s.id   AS subject_id_ref,
        s.name AS subject_name,
        s.code AS subject_code,
        u.id   AS creator_id_ref,
        u.first_name AS creator_first_name,
        u.last_name  AS creator_last_name
      FROM assignments a
      LEFT JOIN batches  b ON b.id = a.batch_id
      LEFT JOIN subjects s ON s.id = a.subject_id
      LEFT JOIN users    u ON u.id = a.created_by
      WHERE ${whereClauses}
      ORDER BY a.created_at DESC
      ${paginationSql}`,
      params
    );

    const enrichedAssignments = rows.map((row: any) => ({
      ...row,
      due_date: row.due_date,
      is_draft: row.is_draft,
      batches: row.batch_name ? { id: row.batch_id_ref, name: row.batch_name, semester: row.semester, section: row.section } : null,
      subjects: row.subject_name ? { id: row.subject_id_ref, name: row.subject_name, code: row.subject_code } : null,
      users: (row.creator_first_name || row.creator_last_name)
        ? { name: `${row.creator_first_name || ''} ${row.creator_last_name || ''}`.trim() }
        : null,
    }));

    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(enrichedAssignments, total, page, limit);
      return NextResponse.json({
        success: true,
        assignments: paginatedResult.data,
        meta: paginatedResult.meta
      });
    } else {
      return NextResponse.json({
        success: true,
        assignments: enrichedAssignments,
        meta: { total: enrichedAssignments.length }
      });
    }

  } catch (error: any) {
    console.error('Get assignments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
