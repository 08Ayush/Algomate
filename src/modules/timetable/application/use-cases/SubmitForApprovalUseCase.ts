import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';

export class SubmitForApprovalUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(timetableId: string, userId: string, userRole: string) {
        // Authorization: Only creators can submit
        if (userRole !== 'creator') {
            throw new Error('Only creators can submit timetables for review.');
        }

        // Verify timetable exists
        const existing = await this.timetableRepository.findById(timetableId);
        if (!existing) {
            throw new Error('Timetable not found');
        }

        // Update status to pending_approval
        const timetable = await this.timetableRepository.updateStatus(timetableId, 'pending_approval');

        // Log workflow action
        await this.timetableRepository.logWorkflowAction(
            timetableId,
            'submitted_for_review',
            userId,
            'Submitted for review by creator'
        );

        return {
            success: true,
            message: 'Timetable submitted for review! Publishers will be notified.',
            timetable: timetable.toJSON()
        };
    }
}
