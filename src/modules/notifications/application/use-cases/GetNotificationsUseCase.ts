import { INotificationRepository } from '../../domain/repositories/INotificationRepository';

export class GetNotificationsUseCase {
    constructor(private readonly notificationRepository: INotificationRepository) { }

    async execute(userId: string) {
        const [notifications, unreadCount] = await Promise.all([
            this.notificationRepository.findByUser(userId),
            this.notificationRepository.countUnreadByUser(userId)
        ]);

        return {
            notifications: notifications.map(n => n.toJSON()),
            unreadCount
        };
    }
}
