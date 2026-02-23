/**
 * Event Entity
 */
export class Event {
    constructor(
        public readonly id: string,
        public readonly title: string,
        public readonly description: string,
        public readonly eventDate: Date,
        public readonly location: string,
        public readonly maxParticipants: number | null,
        public readonly departmentId: string,
        public readonly createdBy: string,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            event_date: this.eventDate.toISOString(),
            location: this.location,
            max_participants: this.maxParticipants,
            department_id: this.departmentId,
            created_by: this.createdBy,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }
}

/**
 * Event Registration Entity
 */
export class EventRegistration {
    constructor(
        public readonly id: string,
        public readonly eventId: string,
        public readonly userId: string,
        public readonly status: 'registered' | 'cancelled',
        public readonly createdAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            event_id: this.eventId,
            user_id: this.userId,
            status: this.status,
            created_at: this.createdAt.toISOString()
        };
    }
}
