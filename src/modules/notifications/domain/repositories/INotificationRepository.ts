import { Notification, NotificationData, ContentType, Priority } from '../entities/Notification';

export interface INotificationRepository {
    // Core CRUD operations
    findById(id: string): Promise<Notification | null>;
    findByUser(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
    findUnreadByUser(userId: string, limit?: number): Promise<Notification[]>;
    create(notification: NotificationData): Promise<Notification>;
    createMany(notifications: NotificationData[]): Promise<Notification[]>;

    // Mark as read operations
    markAsRead(id: string): Promise<Notification>;
    markManyAsRead(ids: string[]): Promise<boolean>;
    markAllAsRead(userId: string): Promise<boolean>;

    // Delete operations
    delete(id: string): Promise<boolean>;
    deleteMany(ids: string[]): Promise<boolean>;
    deleteExpired(): Promise<number>;

    // Count operations
    countUnreadByUser(userId: string): Promise<number>;

    // Filter operations
    findByContentType(userId: string, contentType: ContentType, limit?: number): Promise<Notification[]>;
    findByPriority(userId: string, priority: Priority, limit?: number): Promise<Notification[]>;
}
