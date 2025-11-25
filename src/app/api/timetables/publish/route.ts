import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkConflictsBeforePublish, storeConflicts } from '@/lib/crossDepartmentConflicts';
import { publishToMasterRegistry } from '@/lib/masterTimetableRegistry';
import {
  notifyTimetableSubmittedForApproval,
  notifyTimetableApproved,
  notifyTimetableRejected,
  notifyConflictsDetected
} from '@/lib/notificationService';

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

        // ✨ NEW: Check for cross-department conflicts before approving
        console.log('🔍 Checking for cross-department conflicts...');
        const conflictCheck = await checkConflictsBeforePublish(timetableId);
        
        if (conflictCheck.hasConflicts) {
          console.warn(`⚠️ Found ${conflictCheck.conflictCount} conflicts (${conflictCheck.criticalCount} critical)`);
          
          // Store conflicts in database
          await storeConflicts(timetableId, conflictCheck.conflicts);
          
          // ✨ NEW: Notify about conflicts
          await notifyConflictsDetected({
            timetableId,
            timetableTitle: timetable.title,
            batchId: timetable.batch_id,
            departmentId: timetable.department_id,
            conflictCount: conflictCheck.conflictCount,
            criticalCount: conflictCheck.criticalCount,
            creatorId: timetable.created_by
          });
          
          // Return conflicts to user for resolution
          return NextResponse.json({
            success: false,
            error: 'Cross-department conflicts detected',
            conflicts: conflictCheck.conflicts,
            conflictCount: conflictCheck.conflictCount,
            criticalCount: conflictCheck.criticalCount,
            message: 'Please resolve conflicts before publishing. Faculty or classrooms are already scheduled at these times by other departments.',
            requiresResolution: true
          }, { status: 409 }); // 409 Conflict status
        }

        console.log('✅ No conflicts detected, proceeding with approval');

        newStatus = 'approved'; // First approve, then publish to master
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

    // ✨ NEW: Publish to master registry if approved
    if (action === 'approve') {
      console.log('📋 Publishing timetable to master registry...');
      const publishResult = await publishToMasterRegistry(timetableId, publisherId);
      
      if (publishResult.success) {
        console.log(`✅ Published ${publishResult.classes_published} classes to master registry`);
        
        // Update status to 'published' now that it's in master registry
        await supabase
          .from('generated_timetables')
          .update({ status: 'published' })
          .eq('id', timetableId);
      } else {
        console.error('❌ Failed to publish to master registry:', publishResult.errors);
        // Rollback approval if master registry fails
        await supabase
          .from('generated_timetables')
          .update({ status: 'pending_approval' })
          .eq('id', timetableId);
        
        return NextResponse.json({
          success: false,
          error: 'Failed to publish to master registry',
          details: publishResult.errors
        }, { status: 500 });
      }
    }

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

    // ✨ ENHANCED: Create notifications using notification service
    // Get publisher name for notifications
    const { data: publisherData } = await supabase
      .from('users')
      .select('name')
      .eq('id', publisherId)
      .single();
    
    const publisherName = publisherData?.name || 'Administrator';

    // Get creator name for submit_for_review notification
    const { data: creatorData } = await supabase
      .from('users')
      .select('name')
      .eq('id', timetable.created_by)
      .single();
    
    const creatorName = creatorData?.name || 'User';

    if (action === 'submit_for_review') {
      // Notify all publishers (HODs + faculty with publish permission)
      const notifyResult = await notifyTimetableSubmittedForApproval({
        timetableId,
        timetableTitle: timetable.title,
        batchId: timetable.batch_id,
        departmentId: timetable.department_id,
        creatorId: timetable.created_by,
        creatorName
      });
      
      if (notifyResult.success) {
        console.log(`✅ Notified ${notifyResult.count} publisher(s) about new timetable submission`);
      } else {
        console.error('⚠️ Warning: Failed to notify publishers:', notifyResult.error);
      }
    } else if (action === 'approve') {
      // Notify creator about approval
      const notifyResult = await notifyTimetableApproved({
        timetableId,
        timetableTitle: timetable.title,
        batchId: timetable.batch_id,
        creatorId: timetable.created_by,
        approverId: publisherId,
        approverName: publisherName
      });
      
      if (notifyResult.success) {
        console.log('✅ Approval notification sent to creator');
      } else {
        console.error('⚠️ Warning: Failed to send approval notification:', notifyResult.error);
      }
    } else if (action === 'reject') {
      // Notify creator about rejection
      const notifyResult = await notifyTimetableRejected({
        timetableId,
        timetableTitle: timetable.title,
        batchId: timetable.batch_id,
        creatorId: timetable.created_by,
        rejectorId: publisherId,
        rejectorName: publisherName,
        reason
      });
      
      if (notifyResult.success) {
        console.log('✅ Rejection notification sent to creator');
      } else {
        console.error('⚠️ Warning: Failed to send rejection notification:', notifyResult.error);
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