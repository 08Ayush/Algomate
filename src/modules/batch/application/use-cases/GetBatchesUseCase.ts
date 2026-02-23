import { IBatchRepository } from '../../domain/repositories/IBatchRepository';

export class GetBatchesUseCase {
    constructor(private readonly batchRepository: IBatchRepository) { }

    async execute(collegeId?: string, departmentId?: string) {
        let batches;

        if (departmentId) {
            batches = await this.batchRepository.findByDepartmentId(departmentId);
        } else if (collegeId) {
            batches = await this.batchRepository.findByCollegeId(collegeId);
        } else {
            throw new Error('Either collegeId or departmentId must be provided');
        }

        return {
            success: true,
            batches: batches.map(b => b.toJSON())
        };
    }
}
