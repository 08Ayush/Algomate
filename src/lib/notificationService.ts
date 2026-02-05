/**
 * Enhanced Notification Service v2
 * Comprehensive notification system for all platform events
 * Supports: Timetables, Assignments, Announcements, Events, System Alerts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Singleton instance for server-side use
let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseInstance;
}

// ============================================================================
// Type Definitions
// ============================================================================

export type NotificationType =
  // Content workflow
  | 'content_pending_review'
  | 'content_approved'
  | 'content_rejected'
  | 'revision_requested'
  // Timetable specific
  | 'timetable_published'
  | 'timetable_approved'
  | 'timetable_rejected'
  | 'schedule_change'
  | 'conflict_detected'
  // Assignments
  | 'assignment_created'
  | 'assignment_due'
  | 'assignment_submitted'
  | 'assignment_graded'
  | 'proctoring_violation'
  // Announcements & Events
  | 'announcement'
  | 'event_created'
  | 'event_reminder'
  | 'event_cancelled'
  // NEP Curriculum
  | 'nep_bucket_created'
  | 'nep_subjects_added'
  | 'nep_bucket_published'
  | 'nep_selection_locked'
  | 'nep_allotment_released'
  // System
  | 'system_alert'
  | 'approval_request'
  | 'resource_updated'
  | 'maintenance_alert'
  | 'policy_update';

export type ContentType =
  | 'timetable'
  | 'assignment'
  | 'announcement'
  | 'event'
  | 'resource'
  | 'system';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationData {
  recipientId: string;
  senderId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  timetableId?: string | null;
  batchId?: string | null;
  contentType?: ContentType;
  contentId?: string | null;
  priority?: Priority;
  actionUrl?: string | null;
  expiresAt?: Date | null;
}

export interface BulkNotificationOptions {
  notifyStudents?: boolean;
  notifyFaculty?: boolean;
  excludeIds?: string[];
}

// ============================================================================
// Core Notification Functions
// ============================================================================

/**
 * Create a single notification
 */
export async function createNotification(
  data: NotificationData
): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  try {
    const supabase = getSupabase();

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        id: randomUUID(),
        recipient_id: data.recipientId,
        sender_id: data.senderId || null,
        type: data.type,
        title: data.title,
        message: data.message,
        timetable_id: data.timetableId || null,
        batch_id: data.batchId || null,
        content_type: data.contentType || null,
        content_id: data.contentId || null,
        priority: data.priority || 'normal',
        action_url: data.actionUrl || null,
        expires_at: data.expiresAt?.toISOString() || null,
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
    if (recipients.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = getSupabase();

    const notifications = recipients.map(recipientId => ({
      id: randomUUID(),
      recipient_id: recipientId,
      sender_id: notificationTemplate.senderId || null,
      type: notificationTemplate.type,
      title: notificationTemplate.title,
      message: notificationTemplate.message,
      timetable_id: notificationTemplate.timetableId || null,
      batch_id: notificationTemplate.batchId || null,
      content_type: notificationTemplate.contentType || null,
      content_id: notificationTemplate.contentId || null,
      priority: notificationTemplate.priority || 'normal',
      action_url: notificationTemplate.actionUrl || null,
      expires_at: notificationTemplate.expiresAt?.toISOString() || null,
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

// ============================================================================
// Recipient Fetching Helpers
// ============================================================================

/**
 * Get all publishers/approvers for a department (HODs + faculty with publish permission)
 */
export async function getDepartmentPublishers(departmentId: string): Promise<string[]> {
  try {
    const supabase = getSupabase();

    console.log('🔍 Looking for publishers in department:', departmentId);

    // Query publishers - check for role=hod, faculty_type=publisher, or explicit permissions
    const { data: publishers, error } = await supabase
      .from('users')
      .select('id, role, faculty_type')
      .eq('department_id', departmentId)
      .eq('is_active', true)
      .or('role.eq.hod,faculty_type.eq.publisher,can_publish_timetables.eq.true,can_approve_timetables.eq.true');

    if (error) {
      console.error('❌ Error fetching publishers:', error);
      return [];
    }

    console.log('📋 Found publishers:', publishers);

    return publishers?.map(p => p.id) || [];
  } catch (error) {
    console.error('❌ Exception in getDepartmentPublishers:', error);
    return [];
  }
}

/**
 * Get all students in a batch
 */
export async function getBatchStudents(batchId: string): Promise<string[]> {
  try {
    const supabase = getSupabase();

    const { data: enrollments, error } = await supabase
      .from('student_batch_enrollment')
      .select('student_id')
      .eq('batch_id', batchId)
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching batch students:', error);
      return [];
    }

    return enrollments?.map(e => e.student_id) || [];
  } catch (error) {
    console.error('❌ Exception in getBatchStudents:', error);
    return [];
  }
}

/**
 * Get all faculty in a department
 */
export async function getDepartmentFaculty(departmentId: string): Promise<string[]> {
  try {
    const supabase = getSupabase();

    const { data: faculty, error } = await supabase
      .from('users')
      .select('id')
      .eq('department_id', departmentId)
      .eq('role', 'faculty')
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching department faculty:', error);
      return [];
    }

    return faculty?.map(f => f.id) || [];
  } catch (error) {
    console.error('❌ Exception in getDepartmentFaculty:', error);
    return [];
  }
}

/**
 * Get all admins for a college
 */
export async function getCollegeAdmins(collegeId: string): Promise<string[]> {
  try {
    const supabase = getSupabase();

    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('college_id', collegeId)
      .in('role', ['admin', 'college_admin', 'super_admin'])
      .eq('is_active', true);

    if (error) {
      console.error('❌ Error fetching college admins:', error);
      return [];
    }

    return admins?.map(a => a.id) || [];
  } catch (error) {
    console.error('❌ Exception in getCollegeAdmins:', error);
    return [];
  }
}

// ============================================================================
// Timetable Workflow Notifications
// ============================================================================

/**
 * Notify when timetable is submitted for review/approval
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
      title: '📋 Timetable Awaiting Approval',
      message: `${params.creatorName} has submitted timetable "${params.timetableTitle}" for your review and approval.`,
      timetableId: params.timetableId,
      batchId: params.batchId,
      contentType: 'timetable',
      contentId: params.timetableId,
      priority: 'high',
      actionUrl: `/faculty/timetables/view/${params.timetableId}`
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
    message: `Your timetable "${params.timetableTitle}" has been approved by ${params.approverName}.`,
    timetableId: params.timetableId,
    batchId: params.batchId,
    contentType: 'timetable',
    contentId: params.timetableId,
    actionUrl: `/faculty/timetables/view/${params.timetableId}`
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
  const reasonText = params.reason ? `\n\nReason: ${params.reason}` : '';

  return createNotification({
    recipientId: params.creatorId,
    senderId: params.rejectorId,
    type: 'timetable_rejected',
    title: '❌ Timetable Rejected',
    message: `Your timetable "${params.timetableTitle}" was rejected by ${params.rejectorName}.${reasonText}\n\nPlease review and resubmit.`,
    timetableId: params.timetableId,
    batchId: params.batchId,
    contentType: 'timetable',
    contentId: params.timetableId,
    priority: 'high',
    actionUrl: `/faculty/timetables/${params.timetableId}`
  });
}

/**
 * Notify when timetable is published - with option to notify students
 */
export async function notifyTimetablePublished(params: {
  timetableId: string;
  timetableTitle: string;
  batchId: string;
  departmentId: string;
  publisherId: string;
  publisherName: string;
  notifyStudents: boolean;
  notifyFaculty?: boolean;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const recipients: string[] = [];

    // Always notify faculty in department
    if (params.notifyFaculty !== false) {
      const faculty = await getDepartmentFaculty(params.departmentId);
      recipients.push(...faculty);
    }

    // Optionally notify students
    if (params.notifyStudents) {
      const students = await getBatchStudents(params.batchId);
      recipients.push(...students);
    }

    // Remove duplicates and exclude publisher
    const uniqueRecipients = [...new Set(recipients)].filter(id => id !== params.publisherId);

    if (uniqueRecipients.length === 0) {
      return { success: true, count: 0 };
    }

    return await createBulkNotifications(uniqueRecipients, {
      senderId: params.publisherId,
      type: 'timetable_published',
      title: '📅 New Timetable Published',
      message: `${params.publisherName} has published timetable "${params.timetableTitle}". Check your schedule now!`,
      timetableId: params.timetableId,
      batchId: params.batchId,
      contentType: 'timetable',
      contentId: params.timetableId,
      actionUrl: `/faculty/timetables/view/${params.timetableId}`
    });
  } catch (error: any) {
    console.error('❌ Error in notifyTimetablePublished:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify affected users when a published timetable is updated - with option to notify students
 */
export async function notifyScheduleChange(params: {
  timetableId: string;
  timetableTitle: string;
  batchId: string;
  departmentId: string;
  changes: string;
  updaterId: string;
  updaterName: string;
  notifyStudents: boolean;
  notifyFaculty?: boolean;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const recipients: string[] = [];

    // Notify faculty if enabled
    if (params.notifyFaculty !== false) {
      const faculty = await getDepartmentFaculty(params.departmentId);
      recipients.push(...faculty);
    }

    // Optionally notify students
    if (params.notifyStudents) {
      const students = await getBatchStudents(params.batchId);
      recipients.push(...students);
    }

    // Remove duplicates and exclude updater
    const uniqueRecipients = [...new Set(recipients)].filter(id => id !== params.updaterId);

    if (uniqueRecipients.length === 0) {
      return { success: true, count: 0 };
    }

    return await createBulkNotifications(uniqueRecipients, {
      senderId: params.updaterId,
      type: 'schedule_change',
      title: '🔄 Schedule Updated',
      message: `${params.updaterName} has updated "${params.timetableTitle}".\n\nChanges: ${params.changes}`,
      timetableId: params.timetableId,
      batchId: params.batchId,
      contentType: 'timetable',
      contentId: params.timetableId,
      priority: 'high',
      actionUrl: `/timetable/${params.timetableId}`
    });
  } catch (error: any) {
    console.error('❌ Error in notifyScheduleChange:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify when conflicts are detected
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

    return await createBulkNotifications(recipients, {
      senderId: null,
      type: 'conflict_detected',
      title: '⚠️ Scheduling Conflicts Detected',
      message: `${params.conflictCount} conflict(s) detected in "${params.timetableTitle}" (${params.criticalCount} critical).\n\nPlease resolve before publishing.`,
      timetableId: params.timetableId,
      batchId: params.batchId,
      contentType: 'timetable',
      contentId: params.timetableId,
      priority: 'urgent',
      actionUrl: `/admin/timetables/${params.timetableId}/conflicts`
    });
  } catch (error: any) {
    console.error('❌ Error in notifyConflictsDetected:', error);
    return { success: false, count: 0, error: error.message };
  }
}

// ============================================================================
// Assignment Notifications
// ============================================================================

/**
 * Notify students when a new assignment is created
 */
export async function notifyAssignmentCreated(params: {
  assignmentId: string;
  assignmentTitle: string;
  batchId: string;
  subjectName: string;
  dueDate: Date;
  creatorId: string;
  creatorName: string;
  notifyStudents: boolean;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    if (!params.notifyStudents) {
      return { success: true, count: 0 };
    }

    const students = await getBatchStudents(params.batchId);

    if (students.length === 0) {
      return { success: true, count: 0 };
    }

    const dueDateStr = params.dueDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return await createBulkNotifications(students, {
      senderId: params.creatorId,
      type: 'assignment_created',
      title: '📝 New Assignment',
      message: `${params.creatorName} has posted a new assignment "${params.assignmentTitle}" for ${params.subjectName}.\n\nDue: ${dueDateStr}`,
      batchId: params.batchId,
      contentType: 'assignment',
      contentId: params.assignmentId,
      actionUrl: `/student/assignments/${params.assignmentId}`
    });
  } catch (error: any) {
    console.error('❌ Error in notifyAssignmentCreated:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify student when their assignment is graded
 */
export async function notifyAssignmentGraded(params: {
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  graderId: string;
  graderName: string;
  grade: string;
  feedback?: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const feedbackText = params.feedback ? `\n\nFeedback: ${params.feedback}` : '';

  return createNotification({
    recipientId: params.studentId,
    senderId: params.graderId,
    type: 'assignment_graded',
    title: '📊 Assignment Graded',
    message: `Your assignment "${params.assignmentTitle}" has been graded by ${params.graderName}.\n\nGrade: ${params.grade}${feedbackText}`,
    contentType: 'assignment',
    contentId: params.assignmentId,
    actionUrl: `/student/assignments/${params.assignmentId}`
  });
}

/**
 * Notify faculty when a student submits an assignment
 */
export async function notifyAssignmentSubmitted(params: {
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  facultyId: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotification({
    recipientId: params.facultyId,
    senderId: params.studentId,
    type: 'assignment_submitted',
    title: '📤 Assignment Submitted',
    message: `${params.studentName} has submitted "${params.assignmentTitle}".`,
    contentType: 'assignment',
    contentId: params.assignmentId,
    actionUrl: `/faculty/assignments/${params.assignmentId}/submissions`
  });
}

/**
 * Notify faculty of proctoring violations
 */
export async function notifyProctoringViolation(params: {
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  facultyId: string;
  violationCount: number;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotification({
    recipientId: params.facultyId,
    senderId: params.studentId,
    type: 'proctoring_violation', // Ensure this is added to NotificationType
    title: '⚠️ Proctoring Alert',
    message: `${params.studentName} recorded ${params.violationCount} violation(s) during "${params.assignmentTitle}".`,
    contentType: 'assignment',
    contentId: params.assignmentId,
    priority: 'high',
    actionUrl: `/faculty/assignments/${params.assignmentId}/submissions`
  });
}

// ============================================================================
// Announcement Notifications
// ============================================================================

/**
 * Broadcast an announcement to selected recipients
 */
export async function notifyAnnouncement(params: {
  announcementId: string;
  title: string;
  message: string;
  senderId: string;
  senderName: string;
  targetType: 'batch' | 'department' | 'college';
  targetId: string;
  priority?: Priority;
  notifyStudents: boolean;
  notifyFaculty: boolean;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const recipients: string[] = [];
    const supabase = getSupabase();

    if (params.targetType === 'batch') {
      if (params.notifyStudents) {
        const students = await getBatchStudents(params.targetId);
        recipients.push(...students);
      }
      // Get faculty teaching this batch
      if (params.notifyFaculty) {
        const { data: batchSubjects } = await supabase
          .from('batch_subjects')
          .select('assigned_faculty_id')
          .eq('batch_id', params.targetId)
          .not('assigned_faculty_id', 'is', null);

        const facultyIds = batchSubjects?.map(bs => bs.assigned_faculty_id).filter(Boolean) || [];
        recipients.push(...facultyIds);
      }
    } else if (params.targetType === 'department') {
      if (params.notifyFaculty) {
        const faculty = await getDepartmentFaculty(params.targetId);
        recipients.push(...faculty);
      }
      if (params.notifyStudents) {
        // Get all batches in department, then all students
        const { data: batches } = await supabase
          .from('batches')
          .select('id')
          .eq('department_id', params.targetId)
          .eq('is_active', true);

        for (const batch of batches || []) {
          const students = await getBatchStudents(batch.id);
          recipients.push(...students);
        }
      }
    } else if (params.targetType === 'college') {
      const { data: users } = await supabase
        .from('users')
        .select('id, role')
        .eq('college_id', params.targetId)
        .eq('is_active', true);

      for (const user of users || []) {
        if (params.notifyStudents && user.role === 'student') {
          recipients.push(user.id);
        }
        if (params.notifyFaculty && user.role === 'faculty') {
          recipients.push(user.id);
        }
      }
    }

    // Remove duplicates and exclude sender
    const uniqueRecipients = [...new Set(recipients)].filter(id => id !== params.senderId);

    if (uniqueRecipients.length === 0) {
      return { success: true, count: 0 };
    }

    return await createBulkNotifications(uniqueRecipients, {
      senderId: params.senderId,
      type: 'announcement',
      title: `📢 ${params.title}`,
      message: `${params.senderName}: ${params.message}`,
      contentType: 'announcement',
      contentId: params.announcementId,
      priority: params.priority || 'normal',
      actionUrl: `/announcements/${params.announcementId}`
    });
  } catch (error: any) {
    console.error('❌ Error in notifyAnnouncement:', error);
    return { success: false, count: 0, error: error.message };
  }
}

// ============================================================================
// Event Notifications
// ============================================================================

/**
 * Notify about a new event
 */
export async function notifyEventCreated(params: {
  eventId: string;
  eventTitle: string;
  eventDate: Date;
  location?: string;
  batchId?: string;
  departmentId?: string;
  collegeId: string;
  creatorId: string;
  creatorName: string;
  notifyStudents: boolean;
  notifyFaculty: boolean;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const recipients: string[] = [];

    if (params.batchId) {
      if (params.notifyStudents) {
        const students = await getBatchStudents(params.batchId);
        recipients.push(...students);
      }
    } else if (params.departmentId) {
      if (params.notifyFaculty) {
        const faculty = await getDepartmentFaculty(params.departmentId);
        recipients.push(...faculty);
      }
    }

    const uniqueRecipients = [...new Set(recipients)].filter(id => id !== params.creatorId);

    if (uniqueRecipients.length === 0) {
      return { success: true, count: 0 };
    }

    const dateStr = params.eventDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const locationText = params.location ? `\nLocation: ${params.location}` : '';

    return await createBulkNotifications(uniqueRecipients, {
      senderId: params.creatorId,
      type: 'event_created',
      title: `🎉 New Event: ${params.eventTitle}`,
      message: `${params.creatorName} has scheduled an event.\n\nDate: ${dateStr}${locationText}`,
      contentType: 'event',
      contentId: params.eventId,
      actionUrl: `/events/${params.eventId}`
    });
  } catch (error: any) {
    console.error('❌ Error in notifyEventCreated:', error);
    return { success: false, count: 0, error: error.message };
  }
}

// ============================================================================
// NEP Curriculum Notifications
// ============================================================================

/**
 * Notify faculty when a new elective bucket is created (and requires subjects)
 */
export async function notifyNEPBucketCreated(params: {
  bucketId: string;
  bucketName: string;
  departmentId: string;
  creatorId: string;
  creatorName: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const faculty = await getDepartmentFaculty(params.departmentId);
    const recipients = faculty.filter(id => id !== params.creatorId);

    if (recipients.length === 0) return { success: true, count: 0 };

    return await createBulkNotifications(recipients, {
      senderId: params.creatorId,
      type: 'nep_bucket_created',
      title: '📦 New Elective Bucket',
      message: `${params.creatorName} created bucket "${params.bucketName}". Please add subjects provided by your department.`,
      contentId: params.bucketId,
      contentType: 'system',
      actionUrl: `/faculty/nep/buckets/${params.bucketId}`
    });
  } catch (error: any) {
    console.error('Error in notifyNEPBucketCreated:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify admin when faculty adds subjects to a bucket
 */
export async function notifySubjectsAddedToBucket(params: {
  bucketId: string;
  bucketName: string;
  subjectCount: number;
  facultyId: string;
  facultyName: string;
  collegeId: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const admins = await getCollegeAdmins(params.collegeId);
    const recipients = admins.filter(id => id !== params.facultyId);

    if (recipients.length === 0) return { success: true, count: 0 };

    return await createBulkNotifications(recipients, {
      senderId: params.facultyId,
      type: 'nep_subjects_added',
      title: '📚 Subjects Added to Bucket',
      message: `${params.facultyName} added ${params.subjectCount} subjects to "${params.bucketName}".`,
      contentId: params.bucketId,
      contentType: 'system',
      actionUrl: `/admin/nep/buckets/${params.bucketId}`
    });
  } catch (error: any) {
    console.error('Error in notifySubjectsAddedToBucket:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify students when a bucket is published for selection
 */
export async function notifyNEPBucketPublished(params: {
  bucketId: string;
  bucketName: string;
  batchId: string;
  publisherId: string;
  publisherName: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const students = await getBatchStudents(params.batchId);
    if (students.length === 0) return { success: true, count: 0 };

    return await createBulkNotifications(students, {
      senderId: params.publisherId,
      type: 'nep_bucket_published',
      title: '🔓 Elective Selection Open',
      message: `Elective bucket "${params.bucketName}" is now open for selection. Choose your subjects now!`,
      contentId: params.bucketId,
      contentType: 'system',
      priority: 'high',
      actionUrl: `/student/nep/selection/${params.bucketId}`
    });
  } catch (error: any) {
    console.error('Error in notifyNEPBucketPublished:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify student when selection is locked
 */
export async function notifyNEPSelectionLocked(params: {
  studentId: string;
  bucketName: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotification({
    recipientId: params.studentId,
    type: 'nep_selection_locked',
    title: '🔒 Selections Locked',
    message: `Your selections for "${params.bucketName}" have been confirmed and locked.`,
    contentType: 'system',
    priority: 'normal'
  });
}

/**
 * Notify student of allotment result
 */
export async function notifyNEPAllotmentReleased(params: {
  studentId: string;
  subjectName: string;
  bucketName: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  return createNotification({
    recipientId: params.studentId,
    type: 'nep_allotment_released',
    title: '✅ Subject Allotted',
    message: `You have been allotted "${params.subjectName}" from bucket "${params.bucketName}".`,
    contentType: 'system',
    priority: 'high',
    actionUrl: `/student/timetable`
  });
}

// ============================================================================
// System Notifications
// ============================================================================

/**
 * Send a system-wide alert
 */
export async function notifySystemAlert(params: {
  title: string;
  message: string;
  collegeId?: string;
  priority: Priority;
  expiresAt?: Date;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from('users')
      .select('id')
      .eq('is_active', true);

    if (params.collegeId) {
      query = query.eq('college_id', params.collegeId);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error('❌ Error fetching users for system alert:', error);
      return { success: false, count: 0, error: error.message };
    }

    const recipients = users?.map(u => u.id) || [];

    return await createBulkNotifications(recipients, {
      senderId: null,
      type: 'system_alert',
      title: `⚠️ ${params.title}`,
      message: params.message,
      contentType: 'system',
      priority: params.priority,
      expiresAt: params.expiresAt
    });
  } catch (error: any) {
    console.error('❌ Error in notifySystemAlert:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Notify about resource updates (faculty/classroom availability changes)
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

    const icon = params.resourceType === 'faculty' ? '👤' : '🏫';
    const typeLabel = params.resourceType === 'faculty' ? 'Faculty' : 'Classroom';

    return await createBulkNotifications(publishers, {
      senderId: params.updaterId,
      type: 'resource_updated',
      title: `${icon} ${typeLabel} Updated`,
      message: `${params.updaterName} has updated ${typeLabel.toLowerCase()} "${params.resourceName}".\n\nChanges: ${params.changes}`,
      contentType: 'resource',
      priority: 'normal'
    });
  } catch (error: any) {
    console.error('❌ Error in notifyResourceUpdated:', error);
    return { success: false, count: 0, error: error.message };
  }
}

// ============================================================================
// Content Workflow Notifications (Generic)
// ============================================================================

/**
 * Generic content pending review notification
 */
export async function notifyContentPendingReview(params: {
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  departmentId: string;
  creatorId: string;
  creatorName: string;
}): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const publishers = await getDepartmentPublishers(params.departmentId);

    if (publishers.length === 0) {
      return { success: true, count: 0 };
    }

    const typeLabel = params.contentType.charAt(0).toUpperCase() + params.contentType.slice(1);

    return await createBulkNotifications(publishers, {
      senderId: params.creatorId,
      type: 'content_pending_review',
      title: `📋 ${typeLabel} Pending Review`,
      message: `${params.creatorName} has submitted "${params.contentTitle}" for review.`,
      contentType: params.contentType,
      contentId: params.contentId,
      priority: 'high'
    });
  } catch (error: any) {
    console.error('❌ Error in notifyContentPendingReview:', error);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Generic content approved notification
 */
export async function notifyContentApproved(params: {
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  creatorId: string;
  approverId: string;
  approverName: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const typeLabel = params.contentType.charAt(0).toUpperCase() + params.contentType.slice(1);

  return createNotification({
    recipientId: params.creatorId,
    senderId: params.approverId,
    type: 'content_approved',
    title: `✅ ${typeLabel} Approved`,
    message: `Your ${params.contentType} "${params.contentTitle}" has been approved by ${params.approverName}.`,
    contentType: params.contentType,
    contentId: params.contentId
  });
}

/**
 * Generic content rejected notification
 */
export async function notifyContentRejected(params: {
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  creatorId: string;
  rejectorId: string;
  rejectorName: string;
  reason?: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const typeLabel = params.contentType.charAt(0).toUpperCase() + params.contentType.slice(1);
  const reasonText = params.reason ? `\n\nReason: ${params.reason}` : '';

  return createNotification({
    recipientId: params.creatorId,
    senderId: params.rejectorId,
    type: 'content_rejected',
    title: `❌ ${typeLabel} Rejected`,
    message: `Your ${params.contentType} "${params.contentTitle}" was rejected by ${params.rejectorName}.${reasonText}`,
    contentType: params.contentType,
    contentId: params.contentId,
    priority: 'high'
  });
}

/**
 * Request revision notification
 */
export async function notifyRevisionRequested(params: {
  contentType: ContentType;
  contentId: string;
  contentTitle: string;
  creatorId: string;
  reviewerId: string;
  reviewerName: string;
  comments: string;
}): Promise<{ success: boolean; notificationId?: string; error?: string }> {
  const typeLabel = params.contentType.charAt(0).toUpperCase() + params.contentType.slice(1);

  return createNotification({
    recipientId: params.creatorId,
    senderId: params.reviewerId,
    type: 'revision_requested',
    title: `🔄 Revision Requested`,
    message: `${params.reviewerName} has requested revisions for your ${params.contentType} "${params.contentTitle}".\n\nComments: ${params.comments}`,
    contentType: params.contentType,
    contentId: params.contentId,
    priority: 'high'
  });
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Delete all notifications for a user
 */
export async function deleteUserNotifications(
  userId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = getSupabase();

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
 * Delete old read notifications
 */
export async function deleteOldNotifications(
  daysOld: number = 30
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = getSupabase();
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

/**
 * Delete expired notifications
 */
export async function deleteExpiredNotifications(): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const supabase = getSupabase();

    const { count, error } = await supabase
      .from('notifications')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('❌ Error deleting expired notifications:', error);
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('❌ Exception in deleteExpiredNotifications:', error);
    return { success: false, count: 0, error: error.message };
  }
}
