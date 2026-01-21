import { IBatchRepository } from '../../domain/repositories/IBatchRepository';

export class PromoteBatchUseCase {
    constructor(private readonly batchRepository: IBatchRepository) { }

    async execute(batchId: string) {
        const batch = await this.batchRepository.promoteBatch(batchId);

        return {
            success: true,
            message: `Batch promoted to semester ${batch.semester}`,
            batch: batch.toJSON()
        };
    }
}
