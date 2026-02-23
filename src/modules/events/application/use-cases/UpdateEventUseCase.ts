import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { Event } from '../../domain/entities/Event';

interface UpdateEventDto {
    id: string;
    title?: string;
    description?: string;
    eventDate?: Date;
    location?: string;
    maxParticipants?: number;
    // other fields as needed
}

export class UpdateEventUseCase {
    constructor(private readonly eventRepository: IEventRepository) { }

    async execute(dto: UpdateEventDto): Promise<{ event: Event; hasConflict: boolean; conflictingEvents: Event[] }> {
        const currentEvent = await this.eventRepository.findById(dto.id);
        if (!currentEvent) {
            throw new Error('Event not found');
        }

        const checkStart = dto.eventDate || currentEvent.eventDate;
        const checkEnd = dto.eventDate || currentEvent.eventDate; // Assuming single day event for simplicity as per repo logic
        const checkLocation = dto.location || currentEvent.location;

        const conflictingEvents = await this.eventRepository.findConflictingEvents(
            checkStart,
            checkEnd,
            checkLocation,
            dto.id
        );

        const hasConflict = conflictingEvents.length > 0;

        // If conflict, we might auto-set status to pending? The route did this.
        // For strict Use Case, we strictly update data. The route/controller logic handled status change.
        // OR we put that logic here. 
        // Let's put status update logic here if conflict found? 
        // The DTO needs to accept what to update.

        const updateData: Partial<Event> = {
            title: dto.title,
            description: dto.description,
            eventDate: dto.eventDate,
            location: dto.location,
            maxParticipants: dto.maxParticipants,
        };

        // Filter undefined
        Object.keys(updateData).forEach(key => (updateData as any)[key] === undefined && delete (updateData as any)[key]);

        const updatedEvent = await this.eventRepository.update(dto.id, updateData);

        return {
            event: updatedEvent,
            hasConflict,
            conflictingEvents
        };
    }
}
