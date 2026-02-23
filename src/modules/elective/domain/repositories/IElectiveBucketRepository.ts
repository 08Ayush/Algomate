import { ElectiveBucket } from '../entities/ElectiveBucket';

export interface IElectiveBucketRepository {
    findById(id: string): Promise<ElectiveBucket | null>;
    findByBatchId(batchId: string): Promise<ElectiveBucket[]>;
    findByCollegeId(collegeId: string): Promise<ElectiveBucket[]>;
    create(bucket: Omit<ElectiveBucket, 'id' | 'createdAt' | 'updatedAt'>): Promise<ElectiveBucket>;
    update(id: string, data: Partial<ElectiveBucket>): Promise<ElectiveBucket>;
    delete(id: string): Promise<boolean>;
    deleteByBatchId(batchId: string): Promise<boolean>;
    linkSubjects(bucketId: string, subjectIds: string[]): Promise<void>;
    unlinkSubjects(subjectIds: string[]): Promise<void>;
}
