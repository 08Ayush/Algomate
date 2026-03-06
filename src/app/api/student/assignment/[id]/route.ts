import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { id: assignmentId } = await params;
    // Fetch assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('is_published', true)
      .single();

    if (assignmentError || !assignment) {
      console.error('[Assignment] Not found or not published:', { assignmentId, error: assignmentError?.message });
      return NextResponse.json(
        { success: false, error: 'Assignment not found or not published' },
        { status: 404 }
      );
    }

    console.log('[Assignment] Found:', {
      id: assignment.id,
      title: assignment.title,
      is_published: assignment.is_published,
      scheduled_start: assignment.scheduled_start,
      scheduled_end: assignment.scheduled_end,
      now: new Date().toISOString(),
    });

    // Check if student has already submitted this assignment
    const { data: existingSubmission } = await supabase
      .from('assignment_submissions')
      .select('id, score, percentage, submission_status, submitted_at')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .eq('submission_status', 'SUBMITTED')
      .single();

    if (existingSubmission) {
      console.log('[Assignment] Already submitted by student:', user.id);
      return NextResponse.json(
        {
          success: false,
          error: 'You have already appeared for this assignment',
          alreadySubmitted: true,
          submission: existingSubmission
        },
        { status: 403 }
      );
    }

    // Check if assignment is available (time-based)
    const now = new Date();
    if (assignment.scheduled_start) {
      const startTime = new Date(assignment.scheduled_start);
      if (now < startTime) {
        console.log('[Assignment] Not yet available. Start:', startTime.toISOString(), 'Now:', now.toISOString());
        return NextResponse.json(
          { success: false, error: 'Assignment not yet available', errorCode: 'NOT_YET_AVAILABLE', scheduledStart: assignment.scheduled_start },
          { status: 403 }
        );
      }
    }

    if (assignment.scheduled_end) {
      const endTime = new Date(assignment.scheduled_end);
      if (now > endTime) {
        console.log('[Assignment] Deadline passed. End:', endTime.toISOString(), 'Now:', now.toISOString());
        return NextResponse.json(
          { success: false, error: 'Assignment deadline has passed', errorCode: 'DEADLINE_PASSED', scheduledEnd: assignment.scheduled_end },
          { status: 403 }
        );
      }
    }

    // Fetch subject info
    let enrichedAssignment = { ...assignment };
    if (assignment.subject_id) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('name, code')
        .eq('id', assignment.subject_id)
        .single();
      enrichedAssignment.subjects = subject;
    }

    // Fetch questions
    const { data: questions, error: questionsError } = await supabase
      .from('assignment_questions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .order('question_order', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment: enrichedAssignment,
      questions: questions || []
    });

  } catch (error: any) {
    console.error('Get assignment details error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
