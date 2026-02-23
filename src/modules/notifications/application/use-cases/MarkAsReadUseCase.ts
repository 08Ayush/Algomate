import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { MarkAsReadDto } from '../dto/NotificationDto';

export class MarkAsReadUseCase {
    constructor(private readonly notificationRepository: INotificationRepository) { }

    async execute(dto: MarkAsReadDto) {
        if (dto.mark_all_read && dto.user_id) {
            await this.notificationRepository.markAllAsRead(dto.user_id);
            return { success: true };
        }

        if (dto.notification_ids && dto.notification_ids.length > 0) {
            // Process individually or optimized if repo supported specific IDs update
            // For now, loop is fine as it's usually small number
            const promises = dto.notification_ids.map(id => this.notificationRepository.markAsRead(id));
            await Promise.all(promises);
            return { success: true };
        }

        throw new Error('Invalid request');
    }
}
