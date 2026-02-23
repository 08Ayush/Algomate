import { IEventRegistrationRepository } from '../../domain/repositories/IEventRepository';
import { RegisterForEventDto } from '../dto/EventDto';
import { ConflictError } from '@/shared/middleware/error-handler';

export class RegisterForEventUseCase {
    constructor(private readonly registrationRepository: IEventRegistrationRepository) { }

    async execute(dto: RegisterForEventDto) {
        const registration = await this.registrationRepository.create({
            eventId: dto.event_id,
            userId: dto.user_id,
            status: 'registered'
        });
        return registration.toJSON();
    }
}
