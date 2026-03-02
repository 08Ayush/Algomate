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

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    // Get published assignments for this batch
    // Optimized with Joins
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select(`
        *,
        batches (name, semester, section),
        subjects (name, code)
      `)
      .eq('batch_id', batchId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get student assignments error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch assignments: ' + error.message },
        { status: 500 }
      );
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        success: true,
        assignments: [],
      });
    }

    // Bulk fetch submissions for these assignments for the current student
    const assignmentIds = assignments.map(a => a.id);
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('id, score, percentage, submission_status, submitted_at, assignment_id')
      .in('assignment_id', assignmentIds)
      .eq('student_id', user.id)
      .eq('submission_status', 'SUBMITTED');

    // Map submissions to assignments in memory
    const enrichedAssignments = assignments.map((assignment: any) => {
      const submission = submissions?.find(s => s.assignment_id === assignment.id);

      return {
        ...assignment,
        batches: assignment.batches, // Already joined
        subjects: assignment.subjects, // Already joined
        submission: submission || undefined,
        has_submitted: !!submission
      };
    });

    return NextResponse.json({
      success: true,
      assignments: enrichedAssignments,
    });

  } catch (error: any) {
    console.error('Get student assignments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
