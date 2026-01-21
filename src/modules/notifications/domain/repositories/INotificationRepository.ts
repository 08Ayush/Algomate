import { Notification } from '../entities/Notification';

export interface INotificationRepository {
    findById(id: string): Promise<Notification | null>;
    findByUser(userId: string): Promise<Notification[]>;
    findUnreadByUser(userId: string): Promise<Notification[]>;
    create(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<Notification>;
    createMany(notifications: Omit<Notification, 'id' | 'createdAt'>[]): Promise<Notification[]>;
    markAsRead(id: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    countUnreadByUser(userId: string): Promise<number>;
}
