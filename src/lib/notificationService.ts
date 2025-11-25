/**
 * Enhanced Notification Service
 * Comprehensive notification system for all timetable events
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type NotificationType = 
  | 'timetable_published' 
  | 'schedule_change' 
  | 'system_alert' 
  | 'approval_request'
  | 'timetable_approved'
  | 'timetable_rejected'
  | 'conflict_detected'
  | 'resource_updated';

interface NotificationData {
  recipientId: string;
  senderId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  timetableId?: string | null;
  batchId?: string | null;
}

/**
 * Create a single notification
 */
export async function createNotification(
  data: NotificationData
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: data.recipientId,
        sender_id: data.senderId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        timetable_id: data.timetableId || null,
        batch_id: data.batchId || null,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Error creating notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true, notificationId: notification.id };
  } catch (error: any) {
    console.error('❌ Exception in createNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create bulk notifications for multiple recipients
 */
export async function createBulkNotifications(
  recipients: string[],
  notificationTemplate: Omit<NotificationData, 'recipientId'>
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const notifications = recipients.map(recipientId => ({
      recipient_id: recipientId,
      sender_id: notificationTemplate.senderId || null,
      type: notificationTemplate.type,
      title: notificationTemplate.title,
      message: notificationTemplate.message,
      timetable_id: notificationTemplate.timetableId || null,
      batch_id: notificationTemplate.batchId || null,
      is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('❌ Error creating bulk notifications:', error);
      return { success: false, count: 0, error: error.message };
    }

    console.log(`✅ Created ${notifications.length} notification(s)`);
    return { success: true, count: notifications.length };
  } catch (error: any) {
    console.error('❌ Exception in createBulkNotifications:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Get all publishers for a department (HODs + faculty with publish permission)
 */
async function getDepartmentPublishers(departmentId: string): Promise<string[]> {
  try {
    const { data: publishers, error } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .or('role.eq.hod,can_publish_timetables.eq.true');

    if (error) {
      console.error('❌ Error fetching publishers:', error);
      return [];
    }

    return publishers?.map(p => p.id) || [];
  } catch (error) {
    console.error('❌ Exception in getDepartmentPublishers:', error);
    return [];
  }
}

/**
 * Notify HOD when timetable is submitted for approval
 */
export async function notifyTimetableSubmittedForApproval(params: {
  timetableId: string;
  timetableTitle: string;
  batchId: string;
  departmentId: string;
  creatorId: string;
  creatorName: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const publishers = await getDepartmentPublishers(params.departmentId);

    if (publishers.length === 0) {
      console.warn('⚠️ No publishers found for department:', params.departmentId);
      return { success: true, count: 0 };
    }

    return await createBulkNotifications(publishers, {
      senderId: params.creatorId,
      type: 'approval_request',
      title: '📋 New Timetable Awaiting Approval',
      message: `${params.creatorName} has submitted a timetable "${params.timetableTitle}" for your review and approval.`,
      timetableId: params.timetableId,
      batchId: params.batchId
    });
  } catch (error: any) {
    console.error('❌ Error in notifyTimetableSubmittedForApproval:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify creator when timetable is approved
 */
export async function notifyTimetableApproved(params: {
  timetableId: string;
  timetableTitle: string;
  batchId: string;
  creatorId: string;
  approverId: string;
  approverName: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotification({
    recipientId: params.creatorId,
    senderId: params.approverId,
    type: 'timetable_approved',
    title: '✅ Timetable Approved',
    message: `Your timetable "${params.timetableTitle}" has been approved by ${params.approverName} and is now published.`,
    timetableId: params.timetableId,
    batchId: params.batchId
  });
}

/**
 * Notify creator when timetable is rejected
 */
export async function notifyTimetableRejected(params: {
  timetableId: string;
  timetableTitle: string;
  batchId: string;
  creatorId: string;
  rejectorId: string;
  rejectorName: string;
  reason?: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const message = params.reason
    ? `Your timetable "${params.timetableTitle}" was rejected by ${params.rejectorName}.\n\nReason: ${params.reason}\n\nPlease review and resubmit.`
    : `Your timetable "${params.timetableTitle}" was rejected by ${params.rejectorName}. Please review and resubmit.`;

  return createNotification({
    recipientId: params.creatorId,
    senderId: params.rejectorId,
    type: 'timetable_rejected',
    title: '❌ Timetable Rejected',
    message,
    timetableId: params.timetableId,
    batchId: params.batchId
  });
}

/**
 * Notify relevant users when cross-department conflicts are detected
 */
export async function notifyConflictsDetected(params: {
  timetableId: string;
  timetableTitle: string;
  batchId: string;
  departmentId: string;
  conflictCount: number;
  criticalCount: number;
  creatorId: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const publishers = await getDepartmentPublishers(params.departmentId);
    const recipients = [...new Set([params.creatorId, ...publishers])];

    const message = `🚨 Cross-department conflicts detected in "${params.timetableTitle}".\n\n` +
      `Total conflicts: ${params.conflictCount}\n` +
      `Critical: ${params.criticalCount}\n\n` +
      `These conflicts must be resolved before the timetable can be published.`;

    return await createBulkNotifications(recipients, {
      senderId: null, // System notification
      type: 'conflict_detected',
      title: '⚠️ Resource Conflicts Detected',
      message,
      timetableId: params.timetableId,
      batchId: params.batchId
    });
  } catch (error: any) {
    console.error('❌ Error in notifyConflictsDetected:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify affected users when a published timetable is updated
 */
export async function notifyScheduleChange(params: {
  timetableId: string;
  timetableTitle: string;
  batchId: string;
  departmentId: string;
  changes: string;
  updaterId: string;
  updaterName: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Get all users in the department who should be notified
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', params.departmentId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching department users:', error);
      return { success: false, count: 0, error: error.message };
    }

    const recipients = users?.map(u => u.id) || [];
    // Exclude the updater
    const filteredRecipients = recipients.filter(id => id !== params.updaterId);

    if (filteredRecipients.length === 0) {
      return { success: true, count: 0 };
    }

    return await createBulkNotifications(filteredRecipients, {
      senderId: params.updaterId,
      type: 'schedule_change',
      title: '🔄 Timetable Updated',
      message: `${params.updaterName} has updated the timetable "${params.timetableTitle}".\n\nChanges: ${params.changes}`,
      timetableId: params.timetableId,
      batchId: params.batchId
    });
  } catch (error: any) {
    console.error('❌ Error in notifyScheduleChange:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify when a resource (faculty/classroom) is updated
 */
export async function notifyResourceUpdated(params: {
  resourceType: 'faculty' | 'classroom';
  resourceName: string;
  departmentId: string;
  changes: string;
  updaterId: string;
  updaterName: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const publishers = await getDepartmentPublishers(params.departmentId);

    if (publishers.length === 0) {
      return { success: true, count: 0 };
    }

    const resourceIcon = params.resourceType === 'faculty' ? '👤' : '🏫';
    const resourceTypeLabel = params.resourceType === 'faculty' ? 'Faculty' : 'Classroom';

    return await createBulkNotifications(publishers, {
      senderId: params.updaterId,
      type: 'resource_updated',
      title: `${resourceIcon} ${resourceTypeLabel} Updated`,
      message: `${params.updaterName} has updated ${resourceTypeLabel.toLowerCase()} "${params.resourceName}".\n\nChanges: ${params.changes}`,
      timetableId: null,
      batchId: null
    });
  } catch (error: any) {
    console.error('❌ Error in notifyResourceUpdated:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Delete all notifications for a user (cleanup utility)
 */
export async function deleteUserNotifications(
  userId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .delete()
      .eq('recipient_id', userId);

    if (error) {
      console.error('❌ Error deleting notifications:', error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('❌ Exception in deleteUserNotifications:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Delete old read notifications (maintenance utility)
 */
export async function deleteOldNotifications(
  daysOld: number = 30
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { count, error } = await supabase
      .from('notifications')
      .delete()
      .eq('is_read', true)
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('❌ Error deleting old notifications:', error);
      return { success: false, count: 0, error: error.message };
    }

    console.log(`✅ Deleted ${count || 0} old notification(s)`);
    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('❌ Exception in deleteOldNotifications:', error);
    return { success: false, count: 0, error: error.message };
  }
}
