import { describe, it, expect, beforeEach } from 'vitest';
import { CreateElectiveBucketUseCase } from '@/modules/elective/application/use-cases/CreateElectiveBucketUseCase';
import { MockElectiveBucketRepository } from '@/__tests__/mocks/MockElectiveBucketRepository';

describe('CreateElectiveBucketUseCase', () => {
    let useCase: CreateElectiveBucketUseCase;
    let mockRepository: MockElectiveBucketRepository;

    beforeEach(() => {
        mockRepository = new MockElectiveBucketRepository();
        useCase = new CreateElectiveBucketUseCase(mockRepository);
    });

    it('should create a new elective bucket with valid DTO', async () => {
        // Arrange
        const dto = {
            batch_id: 'batch-123',
            bucket_name: 'Engineering Electives',
            bucket_type: 'GENERAL' as const,
            min_selection: 1,
            max_selection: 2,
            college_id: 'college-456',
        };

        // Act
        const result = await useCase.execute(dto);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Elective bucket created successfully');
        expect(result.bucket).toBeDefined();
        expect(result.bucket?.bucket_name).toBe('Engineering Electives');
        expect(result.bucket?.min_selection).toBe(1);
        expect(result.bucket?.max_selection).toBe(2);
    });

    it('should link subjects if provided in DTO', async () => {
        // Arrange
        const dto = {
            batch_id: 'batch-123',
            bucket_name: 'CS Electives',
            bucket_type: 'SKILL' as const,
            min_selection: 1,
            max_selection: 1,
            college_id: 'college-456',
            subject_ids: ['subject-1', 'subject-2'],
        };

        // Act
        const result = await useCase.execute(dto);

        // Assert
        expect(result.success).toBe(true);
        expect(result.bucket).toBeDefined();
    });

    it('should create bucket without subjects if none provided', async () => {
        // Arrange
        const dto = {
            batch_id: 'batch-123',
            bucket_name: 'Empty Bucket',
            bucket_type: 'GENERAL' as const,
            min_selection: 1,
            max_selection: 3,
            college_id: 'college-456',
        };

        // Act
        const result = await useCase.execute(dto);

        // Assert
        expect(result.success).toBe(true);
        expect(result.bucket?.bucket_name).toBe('Empty Bucket');
    });

    it('should handle repository errors gracefully', async () => {
        // Arrange
        const invalidDto = {
            batch_id: '',
            bucket_name: '',
            bucket_type: 'GENERAL' as const,
            min_selection: 1,
            max_selection: 1,
            college_id: '',
        };

        // Act & Assert
        await expect(useCase.execute(invalidDto)).rejects.toThrow();
    });
});
