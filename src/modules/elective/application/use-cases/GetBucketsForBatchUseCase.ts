import { IElectiveBucketRepository } from '../../domain/repositories/IElectiveBucketRepository';

export class GetBucketsForBatchUseCase {
    constructor(private readonly bucketRepository: IElectiveBucketRepository) { }

    async execute(batchId: string) {
        const buckets = await this.bucketRepository.findByBatchId(batchId);

        return {
            success: true,
            buckets: buckets.map(b => b.toJSON())
        };
    }
}
