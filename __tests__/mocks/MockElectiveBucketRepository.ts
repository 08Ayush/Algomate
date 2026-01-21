import { IElectiveBucketRepository } from '@/modules/elective/domain/repositories/IElectiveBucketRepository';
import { ElectiveBucket } from '@/modules/elective/domain/entities/ElectiveBucket';

export class MockElectiveBucketRepository implements IElectiveBucketRepository {
    private buckets: Map<string, ElectiveBucket> = new Map();

    async findById(id: string): Promise<ElectiveBucket | null> {
        return this.buckets.get(id) || null;
    }

    async findByBatchId(batchId: string): Promise<ElectiveBucket[]> {
        return Array.from(this.buckets.values()).filter(
            (b) => b.batchId === batchId
        );
    }

    async findByCollegeId(collegeId: string): Promise<ElectiveBucket[]> {
        return Array.from(this.buckets.values()).filter(
            (b) => b.collegeId === collegeId
        );
    }

    async create(bucket: Omit<ElectiveBucket, 'id' | 'createdAt' | 'updatedAt'>): Promise<ElectiveBucket> {
        const newBucket = new ElectiveBucket(
            'test-id-' + Date.now(),
            bucket.batchId,
            bucket.bucketName,
            bucket.bucketType,
            bucket.minSelection,
            bucket.maxSelection,
            bucket.collegeId,
            new Date(),
            new Date()
        );
        this.buckets.set(newBucket.id, newBucket);
        return newBucket;
    }

    async update(id: string, data: Partial<ElectiveBucket>): Promise<ElectiveBucket> {
        const bucket = this.buckets.get(id);
        if (!bucket) throw new Error('Bucket not found');

        const updated = new ElectiveBucket(
            bucket.id,
            bucket.batchId,
            data.bucketName || bucket.bucketName,
            data.bucketType || bucket.bucketType,
            data.minSelection || bucket.minSelection,
            data.maxSelection || bucket.maxSelection,
            bucket.collegeId,
            bucket.createdAt,
            new Date()
        );

        this.buckets.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        return this.buckets.delete(id);
    }

    async linkSubjects(bucketId: string, subjectIds: string[]): Promise<void> {
        // Mock implementation
    }

    async unlinkSubjects(bucketId: string, subjectIds: string[]): Promise<void> {
        // Mock implementation
    }

    // Test utility methods
    setSeed(buckets: ElectiveBucket[]) {
        buckets.forEach((bucket) => this.buckets.set(bucket.id, bucket));
    }

    clear() {
        this.buckets.clear();
    }
}
