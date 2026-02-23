import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';

export class ApproveTimetableUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(timetableId: string, userId: string, userRole: string) {
        // Authorization: Only publishers can approve
        if (userRole !== 'publisher') {
            throw new Error('Only publishers can approve timetables.');
        }

        // Update status to published
        const timetable = await this.timetableRepository.updateStatus(timetableId, 'published');

        // Log workflow action
        await this.timetableRepository.logWorkflowAction(
            timetableId,
            'approved',
            userId,
            'Approved and published by publisher'
        );

        return {
            success: true,
            message: 'Timetable approved and published successfully!',
            timetable: timetable.toJSON()
        };
    }
}
