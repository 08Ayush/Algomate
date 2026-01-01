import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const user = getAuthenticatedUser(request);
    if (!user || !user.user_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get published assignments for this batch
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
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

    // Manually fetch related data to avoid join issues
    const enrichedAssignments = await Promise.all(
      (assignments || []).map(async (assignment: any) => {
        const enriched = { ...assignment };

        // Fetch batch info if batch_id exists
        if (assignment.batch_id) {
          const { data: batch } = await supabase
            .from('batches')
            .select('name, semester, section')
            .eq('id', assignment.batch_id)
            .single();
          enriched.batches = batch;
        }

        // Fetch subject info if subject_id exists
        if (assignment.subject_id) {
          const { data: subject } = await supabase
            .from('subjects')
            .select('name, code')
            .eq('id', assignment.subject_id)
            .single();
          enriched.subjects = subject;
        }

        // Check if student has submitted this assignment
        const { data: submission } = await supabase
          .from('assignment_submissions')
          .select('id, score, percentage, submission_status, submitted_at')
          .eq('assignment_id', assignment.id)
          .eq('student_id', user.user_id)
          .eq('submission_status', 'SUBMITTED')
          .single();
        
        if (submission) {
          enriched.submission = submission;
          enriched.has_submitted = true;
        } else {
          enriched.has_submitted = false;
        }

        return enriched;
      })
    );

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
