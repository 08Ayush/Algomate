import { IBatchRepository } from '../../domain/repositories/IBatchRepository';
import { Batch } from '../../domain/entities/Batch';

export class GetBatchesUseCase {
    constructor(private readonly batchRepository: IBatchRepository) { }

    async execute(collegeId?: string, departmentId?: string): Promise<Batch[]> {
        return this.batchRepository.findActive(collegeId, departmentId);
    }
}
