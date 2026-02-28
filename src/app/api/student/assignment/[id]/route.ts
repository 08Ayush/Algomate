import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper function to decode and verify user from token


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = requireAuth(request);
    if (!user || !user.user_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const assignmentId = params.id;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('is_published', true)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if student has already submitted this assignment
    const { data: existingSubmission } = await supabase
      .from('assignment_submissions')
      .select('id, score, percentage, submission_status, submitted_at')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.user_id)
      .eq('submission_status', 'SUBMITTED')
      .single();

    if (existingSubmission) {
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
        return NextResponse.json(
          { success: false, error: 'Assignment not yet available' },
          { status: 403 }
        );
      }
    }

    if (assignment.scheduled_end) {
      const endTime = new Date(assignment.scheduled_end);
      if (now > endTime) {
        return NextResponse.json(
          { success: false, error: 'Assignment deadline has passed' },
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
