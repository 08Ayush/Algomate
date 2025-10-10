import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timetableId, action, reason, publisherId } = body;

    console.log('📤 Publish/Approval request:', { timetableId, action, publisherId });

    // Validate required fields
    if (!timetableId || !action || !publisherId) {
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'submit_for_review'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, or submit_for_review', success: false },
        { status: 400 }
      );
    }

    // Get current timetable
    const { data: timetable, error: fetchError } = await supabase
      .from('generated_timetables')
      .select('*')
      .eq('id', timetableId)
      .single();

    if (fetchError || !timetable) {
      console.error('❌ Timetable not found:', fetchError);
      return NextResponse.json(
        { error: 'Timetable not found', success: false },
        { status: 404 }
      );
    }

    let newStatus = timetable.status;
    let workflowStep = '';
    let updateData: any = {};

    switch (action) {
      case 'submit_for_review':
        if (timetable.status !== 'draft') {
          return NextResponse.json(
            { error: 'Only draft timetables can be submitted for review', success: false },
            { status: 400 }
          );
        }
        newStatus = 'pending_approval';
        workflowStep = 'submitted_for_review';
        break;

      case 'approve':
        if (timetable.status !== 'pending_approval') {
          return NextResponse.json(
            { error: 'Only pending timetables can be approved', success: false },
            { status: 400 }
          );
        }
        newStatus = 'published';
        workflowStep = 'approved';
        updateData.approved_by = publisherId;
        updateData.approved_at = new Date().toISOString();
        break;

      case 'reject':
        if (timetable.status !== 'pending_approval') {
          return NextResponse.json(
            { error: 'Only pending timetables can be rejected', success: false },
            { status: 400 }
          );
        }
        if (!reason) {
          return NextResponse.json(
            { error: 'Rejection reason is required', success: false },
            { status: 400 }
          );
        }
        newStatus = 'rejected';
        workflowStep = 'rejected';
        updateData.review_notes = reason;
        break;
    }

    updateData.status = newStatus;

    console.log('💾 Updating timetable status to:', newStatus);

    // Update timetable status
    const { error: updateError } = await supabase
      .from('generated_timetables')
      .update(updateData)
      .eq('id', timetableId);

    if (updateError) {
      console.error('❌ Error updating timetable:', updateError);
      return NextResponse.json(
        { error: 'Failed to update timetable', success: false, details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Timetable status updated successfully');

    // Create workflow approval record using the schema structure
    const { error: workflowError } = await supabase
      .from('workflow_approvals')
      .insert({
        timetable_id: timetableId,
        workflow_step: workflowStep,
        performed_by: publisherId,
        comments: reason || `Timetable ${workflowStep}`,
        rejection_reason: action === 'reject' ? reason : null,
        approval_level: action === 'approve' ? 'publisher' : action === 'reject' ? 'publisher' : 'creator'
      });

    if (workflowError) {
      console.error('⚠️ Warning: Failed to create workflow record:', workflowError);
      // Don't fail the whole operation
    } else {
      console.log('✅ Workflow approval record created');
    }

    // Create notification for the creator (if approved/rejected)
    if (action === 'approve' || action === 'reject') {
      const notificationType = action === 'approve' ? 'timetable_published' : 'approval_request';
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: timetable.created_by,
          sender_id: publisherId,
          type: notificationType,
          title: action === 'approve' ? 'Timetable Published ✅' : 'Timetable Rejected ❌',
          message: action === 'approve' 
            ? `Your timetable "${timetable.title}" has been approved and published.`
            : `Your timetable "${timetable.title}" was rejected. Reason: ${reason}`,
          related_id: timetableId
        });

      if (notificationError) {
        console.error('⚠️ Warning: Failed to create notification:', notificationError);
      } else {
        console.log('✅ Notification sent to creator');
      }
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: `Timetable ${action === 'approve' ? 'approved and published' : action === 'reject' ? 'rejected' : 'submitted for review'} successfully`
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', success: false },
      { status: 500 }
    );
  }
}