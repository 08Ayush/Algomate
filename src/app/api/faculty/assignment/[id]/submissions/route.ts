import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || !user.user_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch assignment details and verify ownership
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*, batches(name, semester, section), subjects(name, code)')
      .eq('id', assignmentId)
      .eq('created_by', user.user_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch all submissions for this assignment
    const { data: submissions, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      console.error('Submissions fetch error:', submissionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Fetch student details and enrich submissions
    const enrichedSubmissions = await Promise.all(
      (submissions || []).map(async (submission: any) => {
        // Fetch student info
        const { data: student } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, college_uid')
          .eq('id', submission.student_id)
          .single();

        // Fetch submission answers count
        const { count: answersCount } = await supabase
          .from('submission_answers')
          .select('*', { count: 'exact', head: true })
          .eq('submission_id', submission.id);

        // Fetch questions that need manual grading
        const { data: manualGradingAnswers } = await supabase
          .from('submission_answers')
          .select('*, assignment_questions(question_type)')
          .eq('submission_id', submission.id)
          .in('assignment_questions.question_type', ['ESSAY', 'CODING']);

        return {
          ...submission,
          student: student || null,
          answers_count: answersCount || 0,
          requires_manual_grading: manualGradingAnswers && manualGradingAnswers.length > 0
        };
      })
    );

    // Calculate statistics
    const totalSubmissions = enrichedSubmissions.length;
    const gradedSubmissions = enrichedSubmissions.filter(s => !s.auto_graded || s.graded_at).length;
    const pendingGrading = enrichedSubmissions.filter(s => s.requires_manual_grading && !s.graded_at).length;
    const averageScore = totalSubmissions > 0 
      ? enrichedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / totalSubmissions 
      : 0;
    const averagePercentage = totalSubmissions > 0
      ? enrichedSubmissions.reduce((sum, s) => sum + (s.percentage || 0), 0) / totalSubmissions
      : 0;

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        total_marks: assignment.total_marks,
        passing_marks: assignment.passing_marks,
        duration_minutes: assignment.duration_minutes,
        batch: assignment.batches,
        subject: assignment.subjects,
        created_at: assignment.created_at,
        scheduled_start: assignment.scheduled_start,
        scheduled_end: assignment.scheduled_end,
        proctoring_enabled: assignment.proctoring_enabled
      },
      submissions: enrichedSubmissions,
      statistics: {
        total_submissions: totalSubmissions,
        graded_submissions: gradedSubmissions,
        pending_grading: pendingGrading,
        average_score: averageScore.toFixed(2),
        average_percentage: averagePercentage.toFixed(2),
        submission_rate: assignment.batches?.total_students 
          ? ((totalSubmissions / assignment.batches.total_students) * 100).toFixed(2)
          : 'N/A'
      }
    });

  } catch (error: any) {
    console.error('Get assignment submissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
