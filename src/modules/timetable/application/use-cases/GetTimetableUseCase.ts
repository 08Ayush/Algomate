import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';
import { IScheduledClassRepository } from '../../domain/repositories/ITimetableRepository';

export class GetTimetableUseCase {
    constructor(
        private readonly timetableRepository: ITimetableRepository,
        private readonly scheduledClassRepository: IScheduledClassRepository
    ) { }

    async execute(timetableId: string) {
        // Fetch timetable
        const timetable = await this.timetableRepository.findById(timetableId);
        if (!timetable) {
            throw new Error('Timetable not found');
        }

        // Fetch scheduled classes
        const scheduledClasses = await this.scheduledClassRepository.findByTimetable(timetableId);

        return {
            success: true,
            timetable: timetable.toJSON(),
            scheduledClasses: scheduledClasses.map(c => c.toJSON())
        };
    }
}
