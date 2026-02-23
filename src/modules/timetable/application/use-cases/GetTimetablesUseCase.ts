import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';
import { Timetable } from '../../domain/entities/Timetable';

interface GetTimetablesRequest {
    batchId?: string;
    semester?: number;
    status?: string;
    academicYear?: string;
    departmentId?: string;
    collegeId?: string;
}

export class GetTimetablesUseCase {
    constructor(
        private readonly timetableRepository: ITimetableRepository
    ) { }

    async execute(request: GetTimetablesRequest): Promise<Timetable[]> {
        const { batchId, departmentId, collegeId } = request;

        if (batchId) {
            return this.timetableRepository.findByBatch(batchId);
        }

        if (departmentId) {
            return this.timetableRepository.findByDepartment(departmentId);
        }

        if (collegeId) {
            return this.timetableRepository.findByCollege(collegeId);
        }

        // Return empty or implement findAll if needed
        // For now, if no filters, we can return empty or throw
        return [];
    }
}
