import { IElectiveBucketRepository } from '../../domain/repositories/IElectiveBucketRepository';
import { UpdateElectiveBucketDto } from '../dto/ElectiveBucketDto';

export class UpdateElectiveBucketUseCase {
    constructor(private readonly bucketRepository: IElectiveBucketRepository) { }

    async execute(bucketId: string, dto: UpdateElectiveBucketDto) {
        const bucket = await this.bucketRepository.update(bucketId, {
            bucketName: dto.bucket_name,
            bucketType: dto.bucket_type,
            minSelection: dto.min_selection,
            maxSelection: dto.max_selection,
            isCommonSlot: dto.is_common_slot
        });

        return {
            success: true,
            message: 'Bucket updated successfully',
            bucket: bucket.toJSON()
        };
    }
}
