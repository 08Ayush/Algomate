import { SupabaseClient } from '@supabase/supabase-js';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { Notification } from '../../domain/entities/Notification';
import { Database } from '@/shared/database';

export class SupabaseNotificationRepository implements INotificationRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Notification {
        return new Notification(
            row.id,
            row.recipient_id, // Mapped from recipient_id
            row.title,
            row.message,
            row.type,
            row.is_read,
            new Date(row.created_at),
            row.batch_id,
            row.department_id,
            row.timetable_id
        );
    }

    async findById(id: string): Promise<Notification | null> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return this.mapToEntity(data);
    }

    async findByUser(userId: string): Promise<Notification[]> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .select('*')
            .eq('recipient_id', userId) // Changed to recipient_id
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findUnreadByUser(userId: string): Promise<Notification[]> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .select('*')
            .eq('recipient_id', userId) // Changed to recipient_id
            .eq('is_read', false)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .insert({
                recipient_id: notification.userId, // Mapped to recipient_id
                title: notification.title,
                message: notification.message,
                type: notification.type,
                is_read: notification.isRead,
                batch_id: notification.batchId,
                department_id: notification.departmentId,
                timetable_id: notification.timetableId
            } as any)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async createMany(notifications: Omit<Notification, 'id' | 'createdAt'>[]): Promise<Notification[]> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .insert(notifications.map(n => ({
                recipient_id: n.userId, // Mapped to recipient_id
                title: n.title,
                message: n.message,
                type: n.type,
                is_read: n.isRead,
                batch_id: n.batchId || null,
                department_id: n.departmentId || null,
                timetable_id: n.timetableId || null
            })) as any)
            .select();

        if (error) throw error;
        return (data as any[]).map(row => this.mapToEntity(row));
    }

    async markAsRead(id: string): Promise<Notification> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .update({ is_read: true } as any)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async markAllAsRead(userId: string): Promise<boolean> {
        const { error } = await this.db
            .from('notifications' as any)
            .update({ is_read: true } as any)
            .eq('recipient_id', userId) // Changed to recipient_id
            .eq('is_read', false);

        if (error) throw error;
        return true;
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.db
            .from('notifications' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async countUnreadByUser(userId: string): Promise<number> {
        const { count, error } = await this.db
            .from('notifications' as any)
            .select('*', { count: 'exact', head: true })
            .eq('recipient_id', userId) // Changed to recipient_id
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    }
}
