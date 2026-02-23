import { IEventRepository } from '../../domain/repositories/IEventRepository';
import { CreateEventDto } from '../dto/EventDto';

export class CreateEventUseCase {
    constructor(private readonly eventRepository: IEventRepository) { }

    async execute(dto: CreateEventDto): Promise<{ event: any; hasConflict: boolean }> {
        // Check conflicts BEFORE creation? Route checks AFTER.
        // Creating first ensures ID exists. But checking before prevents creation if we want strictness.
        // Route created then checked.
        // We will check before? Or follow route logic?
        // Route logic: "Event created but requires approval due to conflicts".
        // Use case should support this return shape.

        const start = new Date(dto.event_date);
        const end = new Date(dto.event_date); // Single day assumption from route

        const conflictingEvents = await this.eventRepository.findConflictingEvents(
            start,
            end,
            dto.location
        );
        const hasConflict = conflictingEvents.length > 0;

        const event = await this.eventRepository.create({
            title: dto.title,
            description: dto.description,
            eventDate: new Date(dto.event_date),
            location: dto.location,
            maxParticipants: dto.max_participants || null,
            departmentId: dto.department_id,
            createdBy: dto.created_by,
            // Status implied as draft? Repo create doesn't accept status in interface but DB defaults?
            // Existing repo implementation `create` doesn't pass status.
        });

        return {
            event: event.toJSON(),
            hasConflict
        };
    }
}
