import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { Event } from '../../domain/entities/Event';

interface GetEventsRequest {
    id?: string;
    departmentId?: string;
    status?: string;
}

export class GetEventsUseCase {
    constructor(private readonly eventRepository: IEventRepository) { }

    async execute(request: GetEventsRequest): Promise<Event | Event[] | null> {
        if (request.id) {
            return this.eventRepository.findById(request.id);
        }

        return this.eventRepository.findAll({
            status: request.status,
            departmentId: request.departmentId
        });
    }
}
