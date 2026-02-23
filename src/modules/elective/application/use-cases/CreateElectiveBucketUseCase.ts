import { IElectiveBucketRepository } from '../../domain/repositories/IElectiveBucketRepository';
import { CreateElectiveBucketDto } from '../dto/ElectiveBucketDto';

export class CreateElectiveBucketUseCase {
    constructor(private readonly bucketRepository: IElectiveBucketRepository) { }

    async execute(dto: CreateElectiveBucketDto) {
        // Create the bucket
        const bucket = await this.bucketRepository.create({
            batchId: dto.batch_id,
            bucketName: dto.bucket_name,
            bucketType: dto.bucket_type,
            minSelection: dto.min_selection,
            maxSelection: dto.max_selection,
            isCommonSlot: dto.is_common_slot
        } as any);

        // Link subjects if provided
        if (dto.subject_ids && dto.subject_ids.length > 0) {
            await this.bucketRepository.linkSubjects(bucket.id, dto.subject_ids);
        }

        return {
            success: true,
            message: 'Elective bucket created successfully',
            bucket: bucket.toJSON()
        };
    }
}
