import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseElectiveBucketRepository } from '@/modules/elective/infrastructure/persistence/SupabaseElectiveBucketRepository';
import { createClient } from '@supabase/supabase-js';

describe('SupabaseElectiveBucketRepository Integration Tests', () => {
    let repository: SupabaseElectiveBucketRepository;
    let testBucketId: string;

    beforeAll(async () => {
        // Setup test database connection
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        repository = new SupabaseElectiveBucketRepository(supabase);
    });

    afterAll(async () => {
        // Cleanup: Delete test data
        if (testBucketId) {
            await repository.delete(testBucketId);
        }
    });

    it('should create a bucket in the database', async () => {
        // Arrange
        const bucketData = {
            batchId: 'test-batch-integration',
            bucketName: 'Integration Test Bucket',
            bucketType: 'GENERAL' as const,
            minSelection: 1,
            maxSelection: 2,
            collegeId: 'test-college',
        };

        // Act
        const createdBucket = await repository.create(bucketData);
        testBucketId = createdBucket.id;

        // Assert
        expect(createdBucket).toBeDefined();
        expect(createdBucket.id).toBeDefined();
        expect(createdBucket.bucketName).toBe('Integration Test Bucket');
    });

    it('should retrieve bucket by ID', async () => {
        // Act
        const bucket = await repository.findById(testBucketId);

        // Assert
        expect(bucket).toBeDefined();
        expect(bucket?.id).toBe(testBucketId);
        expect(bucket?.bucketName).toBe('Integration Test Bucket');
    });

    it('should update bucket successfully', async () => {
        // Act
        const updatedBucket = await repository.update(testBucketId, {
            bucketName: 'Updated Integration Test Bucket',
            maxSelection: 3,
        });

        // Assert
        expect(updatedBucket.bucketName).toBe('Updated Integration Test Bucket');
        expect(updatedBucket.maxSelection).toBe(3);
    });

    it('should find buckets by batch ID', async () => {
        // Act
        const buckets = await repository.findByBatchId('test-batch-integration');

        // Assert
        expect(buckets).toBeInstanceOf(Array);
        expect(buckets.length).toBeGreaterThan(0);
        expect(buckets[0].batchId).toBe('test-batch-integration');
    });

    it('should delete bucket successfully', async () => {
        // Act
        const result = await repository.delete(testBucketId);

        // Assert
        expect(result).toBe(true);

        // Verify deletion
        const deletedBucket = await repository.findById(testBucketId);
        expect(deletedBucket).toBeNull();

        testBucketId = ''; // Clear to prevent afterAll cleanup
    });
});
