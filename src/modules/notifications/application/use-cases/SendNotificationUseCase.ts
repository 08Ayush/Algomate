import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { SendNotificationDto } from '../dto/NotificationDto';

export class SendNotificationUseCase {
    constructor(private readonly notificationRepository: INotificationRepository) { }

    async execute(dto: SendNotificationDto) {
        const notification = await this.notificationRepository.create({
            userId: dto.user_id,
            title: dto.title,
            message: dto.message,
            type: dto.type,
            isRead: false
        });
        return notification.toJSON();
    }
}
