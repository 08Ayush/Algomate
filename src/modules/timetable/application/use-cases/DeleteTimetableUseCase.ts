import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';

export class DeleteTimetableUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(timetableId: string, userId: string) {
        // Verify timetable exists
        const timetable = await this.timetableRepository.findById(timetableId);
        if (!timetable) {
            throw new Error('Timetable not found');
        }

        // Delete timetable (cascade will handle scheduled_classes and workflow_approvals)
        const success = await this.timetableRepository.delete(timetableId);

        if (!success) {
            throw new Error('Failed to delete timetable');
        }

        return {
            success: true,
            message: 'Timetable deleted successfully'
        };
    }
}
