import { DomainEvent } from '@/shared/events/EventBus';

/**
 * Elective-related domain events
 */

export class BucketPublishedEvent implements DomainEvent {
    eventType = 'bucket.published' as const;
    occurredAt: Date;
    aggregateId: string;
    payload: {
        bucketId: string;
        batchId: string;
        publishedBy: string;
    };

    constructor(bucketId: string, batchId: string, publishedBy: string) {
        this.occurredAt = new Date();
        this.aggregateId = bucketId;
        this.payload = { bucketId, batchId, publishedBy };
    }
}

export class StudentChoiceSubmittedEvent implements DomainEvent {
    eventType = 'student.choice.submitted' as const;
    occurredAt: Date;
    aggregateId: string;
    payload: {
        choiceId: string;
        studentId: string;
        bucketId: string;
        subjectId: string;
        priority: number;
    };

    constructor(
        choiceId: string,
        studentId: string,
        bucketId: string,
        subjectId: string,
        priority: number
    ) {
        this.occurredAt = new Date();
        this.aggregateId = choiceId;
        this.payload = { choiceId, studentId, bucketId, subjectId, priority };
    }
}

export class SubjectAllottedEvent implements DomainEvent {
    eventType = 'student.subject.allotted' as const;
    occurredAt: Date;
    aggregateId: string;
    payload: {
        studentId: string;
        subjectId: string;
        bucketId: string;
    };

    constructor(studentId: string, subjectId: string, bucketId: string) {
        this.occurredAt = new Date();
        this.aggregateId = studentId;
        this.payload = { studentId, subjectId, bucketId };
    }
}
