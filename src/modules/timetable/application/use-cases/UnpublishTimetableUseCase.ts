import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';

export class UnpublishTimetableUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(timetableId: string, userId: string, userRole: string) {
        // Authorization: Only publishers can unpublish
        if (userRole !== 'publisher') {
            throw new Error('Only publishers can unpublish timetables.');
        }

        // Update status to draft
        const timetable = await this.timetableRepository.updateStatus(timetableId, 'draft');

        // Log workflow action
        await this.timetableRepository.logWorkflowAction(
            timetableId,
            'unpublished',
            userId,
            'Timetable unpublished by publisher'
        );

        return {
            success: true,
            message: 'Timetable unpublished successfully',
            timetable: timetable.toJSON()
        };
    }
}
