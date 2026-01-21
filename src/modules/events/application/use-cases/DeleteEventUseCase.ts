import { IEventRepository } from '../../domain/repositories/IEventRepository';

export class DeleteEventUseCase {
    constructor(private readonly eventRepository: IEventRepository) { }

    async execute(id: string): Promise<boolean> {
        return this.eventRepository.delete(id);
    }
}
