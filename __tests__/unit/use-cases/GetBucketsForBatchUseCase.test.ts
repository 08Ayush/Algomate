import { describe, it, expect, beforeEach } from 'vitest';
import { GetBucketsForBatchUseCase } from '@/modules/elective/application/use-cases/GetBucketsForBatchUseCase';
import { MockElectiveBucketRepository } from '@/__tests__/mocks/MockElectiveBucketRepository';
import { ElectiveBucket } from '@/modules/elective/domain/entities/ElectiveBucket';

describe('GetBucketsForBatchUseCase', () => {
    let useCase: GetBucketsForBatchUseCase;
    let mockRepository: MockElectiveBucketRepository;

    beforeEach(() => {
        mockRepository = new MockElectiveBucketRepository();
        useCase = new GetBucketsForBatchUseCase(mockRepository);
    });

    it('should return all buckets for a specific batch', async () => {
        // Arrange
        const testBuckets = [
            new ElectiveBucket(
                'bucket-1',
                'batch-123',
                'Bucket 1',
                'GENERAL',
                1,
                2,
                'college-1',
                new Date(),
                new Date()
            ),
            new ElectiveBucket(
                'bucket-2',
                'batch-123',
                'Bucket 2',
                'SKILL',
                1,
                1,
                'college-1',
                new Date(),
                new Date()
            ),
            new ElectiveBucket(
                'bucket-3',
                'batch-456', // Different batch
                'Bucket 3',
                'GENERAL',
                1,
                1,
                'college-1',
                new Date(),
                new Date()
            ),
        ];
        mockRepository.setSeed(testBuckets);

        // Act
        const result = await useCase.execute('batch-123');

        // Assert
        expect(result.success).toBe(true);
        expect(result.buckets).toHaveLength(2);
        expect(result.buckets[0].batch_id).toBe('batch-123');
        expect(result.buckets[1].batch_id).toBe('batch-123');
    });

    it('should return empty array if no buckets exist for batch', async () => {
        // Act
        const result = await useCase.execute('non-existent-batch');

        // Assert
        expect(result.success).toBe(true);
        expect(result.buckets).toHaveLength(0);
    });

    it('should return buckets with correct data structure', async () => {
        // Arrange
        const testBucket = new ElectiveBucket(
            'bucket-1',
            'batch-123',
            'Test Bucket',
            'HONORS',
            2,
            3,
            'college-1',
            new Date(),
            new Date()
        );
        mockRepository.setSeed([testBucket]);

        // Act
        const result = await useCase.execute('batch-123');

        // Assert
        expect(result.buckets[0]).toMatchObject({
            id: 'bucket-1',
            batch_id: 'batch-123',
            bucket_name: 'Test Bucket',
            bucket_type: 'HONORS',
            min_selection: 2,
            max_selection: 3,
        });
    });
});
