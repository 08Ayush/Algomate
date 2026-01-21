import { Event, EventRegistration } from '../entities/Event';

export interface IEventRepository {
    findById(id: string): Promise<Event | null>;
    findByDepartment(departmentId: string): Promise<Event[]>;
    findAll(filters?: { status?: string; departmentId?: string }): Promise<Event[]>;
    findUpcoming(): Promise<Event[]>;
    findConflictingEvents(start: Date, end: Date, location: string, excludeId?: string): Promise<Event[]>;
    create(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event>;
    update(id: string, data: Partial<Event>): Promise<Event>;
    delete(id: string): Promise<boolean>;
}

export interface IEventRegistrationRepository {
    findById(id: string): Promise<EventRegistration | null>;
    findByEvent(eventId: string): Promise<EventRegistration[]>;
    findByUser(userId: string): Promise<EventRegistration[]>;
    create(registration: Omit<EventRegistration, 'id' | 'createdAt'>): Promise<EventRegistration>;
    cancel(id: string): Promise<EventRegistration>;
    countByEvent(eventId: string): Promise<number>;
}
