import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { notifyAssignmentGraded } from '@/lib/notificationService';

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

/**
 * POST /api/assignments/[id]/grade/[submissionId]
 * Grade a student's assignment submission
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { id: assignmentId, submissionId } = await params;

        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        // Only faculty and admins can grade
        if (!['super_admin', 'college_admin', 'admin', 'faculty'].includes(user.role)) {
            return NextResponse.json(
                { success: false, error: 'Insufficient permissions to grade assignments' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            score,
            feedback,
            questionGrades, // Array of { questionId, score, feedback }
            notifyStudent = true
        } = body;

        // Validate input
        if (score === undefined || score === null) {
            return NextResponse.json(
                { success: false, error: 'Score is required' },
                { status: 400 }
            );
        }

        // Fetch submission with assignment details
        const { data: submission, error: fetchError } = await supabase
            .from('assignment_submissions')
            .select(`
        *,
        assignments:assignment_id (
          id,
          title,
          total_marks,
          passing_marks,
          college_id,
          created_by
        ),
        users:student_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
            .eq('id', submissionId)
            .eq('assignment_id', assignmentId)
            .single();

        if (fetchError || !submission) {
            return NextResponse.json(
                { success: false, error: 'Submission not found' },
                { status: 404 }
            );
        }

        // Verify assignment belongs to user's college or they are the creator
        const assignment = submission.assignments;
        if (assignment.college_id !== user.college_id && assignment.created_by !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Determine grade based on score
        const passingMarks = assignment.passing_marks || (assignment.total_marks * 0.4);
        const percentage = (score / assignment.total_marks) * 100;
        let grade = 'F';
        if (percentage >= 90) grade = 'A+';
        else if (percentage >= 80) grade = 'A';
        else if (percentage >= 70) grade = 'B+';
        else if (percentage >= 60) grade = 'B';
        else if (percentage >= 50) grade = 'C';
        else if (percentage >= 40) grade = 'D';

        const isPassed = score >= passingMarks;

        // Update submission with grade
        const { error: updateError } = await supabase
            .from('assignment_submissions')
            .update({
                obtained_marks: score,
                feedback: feedback || null,
                graded_at: new Date().toISOString(),
                graded_by: user.id,
                status: 'GRADED',
                is_passed: isPassed
            })
            .eq('id', submissionId);

        if (updateError) {
            console.error('Grade update error:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to save grade: ' + updateError.message },
                { status: 500 }
            );
        }

        // If individual question grades provided, save them
        if (questionGrades && questionGrades.length > 0) {
            const questionGradesToInsert = questionGrades.map((qg: any) => ({
                submission_id: submissionId,
                question_id: qg.questionId,
                obtained_marks: qg.score,
                feedback: qg.feedback || null
            }));

            // Upsert question grades (update if exists, insert if not)
            const { error: questionGradeError } = await supabase
                .from('submission_question_grades')
                .upsert(questionGradesToInsert, {
                    onConflict: 'submission_id,question_id'
                });

            if (questionGradeError) {
                console.error('Question grade save error:', questionGradeError);
                // Non-critical, continue
            }
        }

        // Update analytics
        await updateAssignmentAnalytics(supabase, assignmentId);

        // Send notification to student
        if (notifyStudent) {
            const graderName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Faculty';

            await notifyAssignmentGraded({
                assignmentId,
                assignmentTitle: assignment.title,
                studentId: submission.student_id,
                graderId: user.id,
                graderName,
                grade: `${score}/${assignment.total_marks} (${grade})`,
                feedback: feedback ? feedback.substring(0, 100) : undefined
            });

            console.log('✅ Student notified of grade');
        }

        return NextResponse.json({
            success: true,
            message: 'Assignment graded successfully',
            grade: {
                score,
                totalMarks: assignment.total_marks,
                percentage: percentage.toFixed(1),
                grade,
                isPassed
            },
            notificationSent: notifyStudent
        });

    } catch (error: any) {
        console.error('Grading error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}

/**
 * Update assignment analytics after grading
 */
async function updateAssignmentAnalytics(supabase: any, assignmentId: string) {
    try {
        // Get all graded submissions for this assignment
        const { data: submissions } = await supabase
            .from('assignment_submissions')
            .select('obtained_marks')
            .eq('assignment_id', assignmentId)
            .eq('status', 'GRADED');

        if (!submissions || submissions.length === 0) {
            return;
        }

        const scores = submissions.map((s: any) => s.obtained_marks).filter((s: any) => s !== null);

        if (scores.length === 0) {
            return;
        }

        const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        const highestScore = Math.max(...scores);
        const lowestScore = Math.min(...scores);

        await supabase
            .from('assignment_analytics')
            .update({
                total_submissions: submissions.length,
                avg_score: avgScore,
                highest_score: highestScore,
                lowest_score: lowestScore,
                updated_at: new Date().toISOString()
            })
            .eq('assignment_id', assignmentId);

    } catch (error) {
        console.error('Analytics update error:', error);
    }
}

/**
 * GET /api/assignments/[id]/grade/[submissionId]
 * Get grade details for a submission
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
    try {
        const { id: assignmentId, submissionId } = await params;

        const user = requireAuth(request);
        if (user instanceof NextResponse) return user;

        // Fetch submission with grades
        const { data: submission, error } = await supabase
            .from('assignment_submissions')
            .select(`
        *,
        assignments:assignment_id (
          id,
          title,
          total_marks,
          passing_marks
        ),
        grader:graded_by (
          id,
          first_name,
          last_name
        )
      `)
            .eq('id', submissionId)
            .eq('assignment_id', assignmentId)
            .single();

        if (error || !submission) {
            return NextResponse.json(
                { success: false, error: 'Submission not found' },
                { status: 404 }
            );
        }

        // Students can only see their own grades
        if (user.role === 'student' && submission.student_id !== user.id) {
            return NextResponse.json(
                { success: false, error: 'Access denied' },
                { status: 403 }
            );
        }

        // Get question-level grades if available
        const { data: questionGrades } = await supabase
            .from('submission_question_grades')
            .select('*')
            .eq('submission_id', submissionId);

        return NextResponse.json({
            success: true,
            grade: {
                submissionId: submission.id,
                assignmentId,
                assignmentTitle: submission.assignments?.title,
                score: submission.obtained_marks,
                totalMarks: submission.assignments?.total_marks,
                isPassed: submission.is_passed,
                feedback: submission.feedback,
                gradedAt: submission.graded_at,
                grader: submission.grader ? {
                    id: submission.grader.id,
                    name: `${submission.grader.first_name || ''} ${submission.grader.last_name || ''}`.trim()
                } : null,
                questionGrades: questionGrades || []
            }
        });

    } catch (error: any) {
        console.error('Get grade error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error: ' + error.message },
            { status: 500 }
        );
    }
}
