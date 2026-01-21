/**
 * Notification Entity
 */
export class Notification {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly title: string,
        public readonly message: string,
        public readonly type: 'info' | 'warning' | 'success' | 'error' | 'timetable_published' | 'schedule_change' | 'system_alert' | 'approval_request',
        public readonly isRead: boolean,
        public readonly createdAt: Date,
        public readonly batchId?: string,
        public readonly departmentId?: string,
        public readonly timetableId?: string
    ) { }

    toJSON() {
        return {
            id: this.id,
            user_id: this.userId,
            title: this.title,
            message: this.message,
            type: this.type,
            is_read: this.isRead,
            created_at: this.createdAt.toISOString(),
            batch_id: this.batchId,
            department_id: this.departmentId,
            timetable_id: this.timetableId
        };
    }
}
