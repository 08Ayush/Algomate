/**
 * Notification Entity
 * Extended to support all notification types and additional metadata
 */

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
    // Announcements & Events
    | 'announcement'
    | 'event_created'
    | 'event_reminder'
    | 'event_cancelled'
    // System
    | 'system_alert'
    | 'approval_request'
    | 'resource_updated'
    | 'maintenance_alert'
    | 'policy_update'
    // Legacy
    | 'info'
    | 'warning'
    | 'success'
    | 'error';

export type ContentType =
    | 'timetable'
    | 'assignment'
    | 'announcement'
    | 'event'
    | 'resource'
    | 'system';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export class Notification {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly title: string,
        public readonly message: string,
        public readonly type: NotificationType,
        public readonly isRead: boolean,
        public readonly createdAt: Date,
        public readonly batchId?: string,
        public readonly departmentId?: string,
        public readonly timetableId?: string,
        public readonly senderId?: string,
        public readonly contentType?: ContentType,
        public readonly contentId?: string,
        public readonly priority?: Priority,
        public readonly actionUrl?: string,
        public readonly expiresAt?: Date,
        public readonly readAt?: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            user_id: this.userId,
            recipient_id: this.userId,
            title: this.title,
            message: this.message,
            type: this.type,
            is_read: this.isRead,
            created_at: this.createdAt.toISOString(),
            batch_id: this.batchId,
            department_id: this.departmentId,
            timetable_id: this.timetableId,
            sender_id: this.senderId,
            content_type: this.contentType,
            content_id: this.contentId,
            priority: this.priority,
            action_url: this.actionUrl,
            expires_at: this.expiresAt?.toISOString(),
            read_at: this.readAt?.toISOString()
        };
    }

    /**
     * Check if notification has expired
     */
    isExpired(): boolean {
        if (!this.expiresAt) return false;
        return new Date() > this.expiresAt;
    }

    /**
     * Check if notification is high priority
     */
    isHighPriority(): boolean {
        return this.priority === 'high' || this.priority === 'urgent';
    }
}
