import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';

export class RejectTimetableUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(timetableId: string, userId: string, userRole: string, reason?: string) {
        // Authorization: Only publishers can reject
        if (userRole !== 'publisher') {
            throw new Error('Only publishers can reject timetables.');
        }

        // Update status to rejected
        const timetable = await this.timetableRepository.updateStatus(timetableId, 'rejected');

        // Log workflow action
        await this.timetableRepository.logWorkflowAction(
            timetableId,
            'rejected',
            userId,
            reason || 'Rejected by publisher'
        );

        return {
            success: true,
            message: 'Timetable rejected successfully.',
            timetable: timetable.toJSON()
        };
    }
}
