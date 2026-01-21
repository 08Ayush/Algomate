import { SupabaseClient } from '@supabase/supabase-js';
import { IEventRepository, IEventRegistrationRepository } from '../../domain/repositories/IEventRepository';
import { Event, EventRegistration } from '../../domain/entities/Event';
import { Database } from '@/shared/database';

export class SupabaseEventRepository implements IEventRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Event {
        return new Event(
            row.id,
            row.title,
            row.description,
            new Date(row.event_date),
            row.location,
            row.max_participants,
            row.department_id,
            row.created_by,
            new Date(row.created_at),
            new Date(row.updated_at)
        );
    }

    async findById(id: string): Promise<Event | null> {
        const { data, error } = await this.db
            .from('events' as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }

    async findByDepartment(departmentId: string): Promise<Event[]> {
        const { data, error } = await this.db
            .from('events' as any)
            .select('*')
            .eq('department_id', departmentId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findAll(filters?: { status?: string; departmentId?: string }): Promise<Event[]> {
        let query = this.db.from('events' as any).select('*');

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.departmentId) {
            query = query.eq('department_id', filters.departmentId);
        }

        const { data, error } = await query.order('event_date', { ascending: true });
        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findUpcoming(): Promise<Event[]> {
        const { data, error } = await this.db
            .from('events' as any)
            .select('*')
            .gte('event_date', new Date().toISOString())
            .order('event_date', { ascending: true });

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findConflictingEvents(start: Date, end: Date, location: string, excludeId?: string): Promise<Event[]> {
        let query = this.db
            .from('events' as any)
            .select('*')
            .eq('location', location)
            .eq('status', 'approved')
            .gte('event_date', start.toISOString())
            .lte('event_date', end.toISOString());

        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
        const { data, error } = await this.db
            .from('events' as any)
            .insert({
                title: event.title,
                description: event.description,
                event_date: event.eventDate.toISOString(),
                location: event.location,
                max_participants: event.maxParticipants,
                department_id: event.departmentId,
                created_by: event.createdBy
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async update(id: string, data: Partial<Event>): Promise<Event> {
        const updateData: any = {};
        if (data.title) updateData.title = data.title;
        if (data.description) updateData.description = data.description;
        if (data.eventDate) updateData.event_date = data.eventDate.toISOString();
        if (data.location) updateData.location = data.location;
        // Add other fields as necessary

        const { data: result, error } = await (this.db
            .from('events' as any) as any)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(result);
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('events' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}

export class SupabaseEventRegistrationRepository implements IEventRegistrationRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): EventRegistration {
        return new EventRegistration(
            row.id,
            row.event_id,
            row.user_id,
            row.status,
            new Date(row.created_at)
        );
    }

    async findById(id: string): Promise<EventRegistration | null> {
        const { data, error } = await this.db
            .from('event_registrations' as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }

    async findByEvent(eventId: string): Promise<EventRegistration[]> {
        const { data, error } = await this.db
            .from('event_registrations' as any)
            .select('*')
            .eq('event_id', eventId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findByUser(userId: string): Promise<EventRegistration[]> {
        const { data, error } = await this.db
            .from('event_registrations' as any)
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(registration: Omit<EventRegistration, 'id' | 'createdAt'>): Promise<EventRegistration> {
        const { data, error } = await (this.db
            .from('event_registrations' as any) as any)
            .insert({
                event_id: registration.eventId,
                user_id: registration.userId,
                status: registration.status
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async cancel(id: string): Promise<EventRegistration> {
        const { data, error } = await (this.db
            .from('event_registrations' as any) as any)
            .update({ status: 'cancelled' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async countByEvent(eventId: string): Promise<number> {
        const { count, error } = await (this.db
            .from('event_registrations' as any) as any)
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'registered');

        if (error) throw error;
        return count || 0;
    }
}
