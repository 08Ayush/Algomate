import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Review Hybrid Timetable (Approve or Reject)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timetable_id, action, reviewer_id, comments } = body;

    // Validate inputs
    if (!timetable_id || !action || !reviewer_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "approve" or "reject"'
      }, { status: 400 });
    }

    // Check if timetable exists and is pending
    const { data: timetable, error: fetchError } = await supabase
      .from('generated_timetables')
      .select('*')
      .eq('id', timetable_id)
      .single();

    if (fetchError || !timetable) {
      return NextResponse.json({
        success: false,
        error: 'Timetable not found'
      }, { status: 404 });
    }

    if (timetable.status !== 'pending_approval') {
      return NextResponse.json({
        success: false,
        error: `Timetable cannot be reviewed. Current status: ${timetable.status}`
      }, { status: 400 });
    }

    // Update timetable status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error: updateError } = await supabase
      .from('generated_timetables')
      .update({
        status: newStatus,
        reviewed_by: reviewer_id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', timetable_id);

    if (updateError) {
      console.error('❌ Error updating timetable:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update timetable status'
      }, { status: 500 });
    }

    // Create workflow approval record
    const { error: workflowError } = await supabase
      .from('workflow_approvals')
      .insert({
        timetable_id: timetable_id,
        workflow_step: action === 'approve' ? 'publisher_approved' : 'publisher_rejected',
        performed_by: reviewer_id,
        comments: comments || `Timetable ${action}d by publisher`,
        approval_level: 'publisher',
        approved: action === 'approve'
      });

    if (workflowError) {
      console.error('⚠️ Error creating workflow approval:', workflowError);
      // Don't fail the request, just log the error
    }

    // If approved, potentially publish the timetable
    if (action === 'approve') {
      const { error: publishError } = await supabase
        .from('generated_timetables')
        .update({
          published_at: new Date().toISOString(),
          is_published: true
        })
        .eq('id', timetable_id);

      if (publishError) {
        console.error('⚠️ Error publishing timetable:', publishError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        timetable_id: timetable_id,
        status: newStatus,
        action: action,
        message: `Timetable ${action}d successfully`
      }
    });

  } catch (error: any) {
    console.error('❌ Review error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to review timetable'
    }, { status: 500 });
  }
}
