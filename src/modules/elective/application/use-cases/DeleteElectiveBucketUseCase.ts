import { IElectiveBucketRepository } from '../../domain/repositories/IElectiveBucketRepository';

export class DeleteElectiveBucketUseCase {
    constructor(private readonly bucketRepository: IElectiveBucketRepository) { }

    async execute(bucketId: string) {
        await this.bucketRepository.delete(bucketId);

        return {
            success: true,
            message: 'Bucket deleted successfully'
        };
    }
}
