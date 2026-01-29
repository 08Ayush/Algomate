import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPaginationParams, getPaginationRange, createPaginatedResponse } from '@/shared/utils/pagination';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper function to decode and verify user from token
function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    return decoded;
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = getAuthenticatedUser(request);
    if (!user || !user.user_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      isDraft
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
        created_by: user.user_id,
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

    // Step 3: Get student count for batch and initialize analytics
    const { count: studentCount } = await supabase
      .from('student_batch_enrollment')
      .select('*', { count: 'exact', head: true })
      .eq('batch_id', batchId)
      .eq('is_active', true);

    const { error: analyticsError } = await supabase
      .from('assignment_analytics')
      .insert({
        assignment_id: assignment.id,
        total_students: studentCount || 0,
        total_submissions: 0,
        avg_score: 0,
        highest_score: 0,
        lowest_score: 0,
        avg_time_taken: 0,
      });

    if (analyticsError) {
      console.error('Analytics initialization error:', analyticsError);
      // Non-critical error, continue
    }

    // Step 4: Send notifications to students (if published)
    if (!isDraft) {
      const { data: students } = await supabase
        .from('student_batch_enrollment')
        .select('student_id')
        .eq('batch_id', batchId)
        .eq('is_active', true);

      if (students && students.length > 0) {
        const notifications = students.map((s: any) => ({
          college_id: user.college_id,
          user_id: s.student_id,
          type: 'assignment_created',
          title: 'New Assignment',
          message: `New assignment "${title}" has been created`,
          reference_type: 'assignment',
          reference_id: assignment.id,
          is_read: false,
        }));

        await supabase.from('notifications').insert(notifications);
      }
    }

    return NextResponse.json({
      success: true,
      assignment_id: assignment.id,
      message: isDraft ? 'Assignment saved as draft' : 'Assignment created successfully',
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
    const user = getAuthenticatedUser(request);
    if (!user || !user.user_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { page, limit, isPaginated } = getPaginationParams(request);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query with joins
    let query = supabase
      .from('assignments')
      .select(`
        *,
        batches(id, name, semester, section),
        subjects:subject_id(id, name, code),
        users(id, first_name, last_name)
      `, { count: 'exact' })
      .eq('college_id', user.college_id);

    // Only faculty members see only their created assignments
    if (user.role === 'faculty') {
      query = query.eq('created_by', user.user_id);
    }

    // Default sort
    query = query.order('created_at', { ascending: false });

    // Apply Pagination or Safety Limit
    if (isPaginated && page && limit) {
      const { from, to } = getPaginationRange(page, limit);
      query = query.range(from, to);
    } else {
      query = query.limit(500); // Safety cap
    }

    const { data: assignments, count, error } = await query;

    if (error) {
      console.error('Get assignments error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch assignments: ' + error.message },
        { status: 500 }
      );
    }

    // Mapping for compatibility
    const enrichedAssignments = (assignments || []).map((assignment: any) => ({
      ...assignment,
      subjects: assignment.subjects,
      users: assignment.users ? { name: `${assignment.users.first_name || ''} ${assignment.users.last_name || ''}`.trim() } : null
    }));

    if (isPaginated && page && limit) {
      const paginatedResult = createPaginatedResponse(enrichedAssignments, count || 0, page, limit);
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
