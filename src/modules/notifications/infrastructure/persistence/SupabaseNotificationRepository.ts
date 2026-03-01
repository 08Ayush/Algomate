import { SupabaseClient } from '@supabase/supabase-js';
import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { Notification, NotificationType, ContentType, Priority } from '../../domain/entities/Notification';
import { Database } from '@/shared/database';

export class SupabaseNotificationRepository implements INotificationRepository {
    constructor(private readonly db: SupabaseClient<Database>) { }

    private mapToEntity(row: any): Notification {
        // Handle missing columns gracefully for backwards compatibility
        return new Notification(
            row.id,
            row.recipient_id,
            row.title,
            row.message,
            row.type as NotificationType,
            row.is_read ?? false,
            new Date(row.created_at),
            row.batch_id ?? undefined,
            row.department_id ?? undefined, // May not exist in DB
            row.timetable_id ?? undefined,
            row.sender_id ?? undefined,
            (row.content_type as ContentType) ?? undefined,
            row.content_id ?? undefined,
            (row.priority as Priority) ?? 'normal',
            row.action_url ?? undefined,
            row.expires_at ? new Date(row.expires_at) : undefined,
            row.read_at ? new Date(row.read_at) : undefined
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

    private static readonly NOTIFICATION_COLUMNS = 'id, recipient_id, sender_id, title, message, type, is_read, batch_id, department_id, timetable_id, content_type, content_id, priority, action_url, expires_at, read_at, created_at';

    async findByUser(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .select(SupabaseNotificationRepository.NOTIFICATION_COLUMNS)
            .eq('recipient_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findUnreadByUser(userId: string, limit = 50): Promise<Notification[]> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .select(SupabaseNotificationRepository.NOTIFICATION_COLUMNS)
            .eq('recipient_id', userId)
            .eq('is_read', false)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .insert({
                recipient_id: notification.userId,
                sender_id: notification.senderId || null,
                title: notification.title,
                message: notification.message,
                type: notification.type,
                is_read: notification.isRead,
                batch_id: notification.batchId || null,
                department_id: notification.departmentId || null,
                timetable_id: notification.timetableId || null,
                content_type: notification.contentType || null,
                content_id: notification.contentId || null,
                priority: notification.priority || 'normal',
                action_url: notification.actionUrl || null,
                expires_at: notification.expiresAt?.toISOString() || null
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
                recipient_id: n.userId,
                sender_id: n.senderId || null,
                title: n.title,
                message: n.message,
                type: n.type,
                is_read: n.isRead,
                batch_id: n.batchId || null,
                department_id: n.departmentId || null,
                timetable_id: n.timetableId || null,
                content_type: n.contentType || null,
                content_id: n.contentId || null,
                priority: n.priority || 'normal',
                action_url: n.actionUrl || null,
                expires_at: n.expiresAt?.toISOString() || null
            })) as any)
            .select();

        if (error) throw error;
        return (data as any[]).map(row => this.mapToEntity(row));
    }

    async markAsRead(id: string): Promise<Notification> {
        const updateData: any = {
            is_read: true,
            read_at: new Date().toISOString()
        };
        const { data, error } = await (this.db
            .from('notifications' as any) as any)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapToEntity(data);
    }

    async markManyAsRead(ids: string[]): Promise<boolean> {
        const updateData = {
            is_read: true,
            read_at: new Date().toISOString()
        };
        const { error } = await (this.db
            .from('notifications' as any) as any)
            .update(updateData)
            .in('id', ids);

        if (error) throw error;
        return true;
    }

    async markAllAsRead(userId: string): Promise<boolean> {
        const updateData = {
            is_read: true,
            read_at: new Date().toISOString()
        };
        const { error } = await (this.db
            .from('notifications' as any) as any)
            .update(updateData)
            .eq('recipient_id', userId)
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

    async deleteMany(ids: string[]): Promise<boolean> {
        const { error } = await this.db
            .from('notifications' as any)
            .delete()
            .in('id', ids);

        if (error) throw error;
        return true;
    }

    async deleteExpired(): Promise<number> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .delete()
            .lt('expires_at', new Date().toISOString())
            .select();

        if (error) throw error;
        return data?.length || 0;
    }

    async countUnreadByUser(userId: string): Promise<number> {
        const { count, error } = await this.db
            .from('notifications' as any)
            .select('id', { count: 'exact', head: true })
            .eq('recipient_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return count || 0;
    }

    async findByContentType(userId: string, contentType: ContentType, limit = 50): Promise<Notification[]> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .select(SupabaseNotificationRepository.NOTIFICATION_COLUMNS)
            .eq('recipient_id', userId)
            .eq('content_type', contentType)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }

    async findByPriority(userId: string, priority: Priority, limit = 50): Promise<Notification[]> {
        const { data, error } = await this.db
            .from('notifications' as any)
            .select(SupabaseNotificationRepository.NOTIFICATION_COLUMNS)
            .eq('recipient_id', userId)
            .eq('priority', priority)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data.map(row => this.mapToEntity(row));
    }
}
