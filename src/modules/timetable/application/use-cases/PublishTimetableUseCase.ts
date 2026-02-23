import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';
import { PublishTimetableDto } from '../dto/TimetableDto';

export class PublishTimetableUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(dto: PublishTimetableDto) {
        const timetable = await this.timetableRepository.publish(dto.timetable_id);
        return timetable.toJSON();
    }
}
