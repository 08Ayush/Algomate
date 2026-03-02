import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { notifyAssignmentSubmitted, notifyProctoringViolation } from '@/lib/notificationService';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;

    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { answers, time_taken, violations } = body;

    // Fetch assignment to get questions and calculate score
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*, users:created_by(id, first_name, last_name)')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Fetch questions with correct answers
    const { data: questions, error: questionsError } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', assignmentId);

    if (questionsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    // Calculate score for auto-gradable questions (MCQ, MSQ)
    let totalScore = 0;
    const questionResponses = [];

    for (const question of questions || []) {
      const studentAnswer = answers[question.id];
      let isCorrect = false;
      let earnedMarks = 0;

      if (question.question_type === 'MCQ') {
        // Single correct answer
        const correctOption = question.question_data.options?.find((opt: any) => opt.is_correct);
        isCorrect = studentAnswer === correctOption?.id;
        earnedMarks = isCorrect ? question.marks : 0;
      } else if (question.question_type === 'MSQ') {
        // Multiple correct answers
        const correctOptions = question.question_data.options
          ?.filter((opt: any) => opt.is_correct)
          .map((opt: any) => opt.id)
          .sort();
        const studentOptions = (studentAnswer || []).sort();
        isCorrect = JSON.stringify(correctOptions) === JSON.stringify(studentOptions);
        earnedMarks = isCorrect ? question.marks : 0;
      }
      // Essay and Coding questions require manual grading

      totalScore += earnedMarks;

      questionResponses.push({
        question_id: question.id,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        earned_marks: earnedMarks
      });
    }

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        batch_id: assignment.batch_id,
        submission_status: 'SUBMITTED',
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        time_taken_seconds: time_taken,
        score: totalScore,
        percentage: (totalScore / assignment.total_marks) * 100,
        auto_graded: !questions?.some((q: any) =>
          q.question_type === 'ESSAY' || q.question_type === 'CODING'
        )
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Submission error:', submissionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create submission' },
        { status: 500 }
      );
    }

    // Insert submission answers
    const submissionAnswers = questionResponses.map(qr => ({
      submission_id: submission.id,
      question_id: qr.question_id,
      answer_data: { answer: qr.student_answer },
      is_correct: qr.is_correct,
      marks_awarded: qr.earned_marks
    }));

    const { error: answersError } = await supabase
      .from('submission_answers')
      .insert(submissionAnswers);

    if (answersError) {
      console.error('Answers insertion error:', answersError);
    }

    // Insert proctoring violations if any
    if (violations && violations > 0 && assignment.proctoring_enabled) {
      await supabase
        .from('proctoring_violations')
        .insert({
          submission_id: submission.id,
          violation_type: 'TAB_SWITCH',
          violation_count: violations,
          detected_at: new Date().toISOString()
        });

      // Notify faculty of severe proctoring violations
      if (assignment.created_by) {
        const studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Student';
        await notifyProctoringViolation({
          assignmentId,
          assignmentTitle: assignment.title,
          studentId: user.id,
          studentName,
          facultyId: assignment.created_by,
          violationCount: violations
        }).catch(err => console.error('Proctoring notification error:', err));
      }
    }

    // Notify faculty of submission
    if (assignment.created_by) {
      const studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Student';

      try {
        await notifyAssignmentSubmitted({
          assignmentId,
          assignmentTitle: assignment.title,
          studentId: user.id,
          studentName,
          facultyId: assignment.created_by
        });
        console.log('✅ Faculty notified of assignment submission');
      } catch (notifyError) {
        console.error('Notification error (non-critical):', notifyError);
      }
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        score: totalScore,
        percentage: submission.percentage,
        status: submission.submission_status,
        auto_graded: submission.auto_graded
      }
    });

  } catch (error: any) {
    console.error('Submit assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

