import { DomainEvent } from '@/shared/events/EventBus';

/**
 * Timetable-related domain events
 */

export class TimetableApprovedEvent implements DomainEvent {
    eventType = 'timetable.approved' as const;
    occurredAt: Date;
    aggregateId: string;
    payload: {
        timetableId: string;
        approvedBy: string;
        batchId: string;
    };

    constructor(timetableId: string, approvedBy: string, batchId: string) {
        this.occurredAt = new Date();
        this.aggregateId = timetableId;
        this.payload = { timetableId, approvedBy, batchId };
    }
}

export class TimetableRejectedEvent implements DomainEvent {
    eventType = 'timetable.rejected' as const;
    occurredAt: Date;
    aggregateId: string;
    payload: {
        timetableId: string;
        rejectedBy: string;
        reason?: string;
    };

    constructor(timetableId: string, rejectedBy: string, reason?: string) {
        this.occurredAt = new Date();
        this.aggregateId = timetableId;
        this.payload = { timetableId, rejectedBy, reason };
    }
}

export class TimetableSubmittedEvent implements DomainEvent {
    eventType = 'timetable.submitted' as const;
    occurredAt: Date;
    aggregateId: string;
    payload: {
        timetableId: string;
        submittedBy: string;
        departmentId: string;
    };

    constructor(timetableId: string, submittedBy: string, departmentId: string) {
        this.occurredAt = new Date();
        this.aggregateId = timetableId;
        this.payload = { timetableId, submittedBy, departmentId };
    }
}
