import { Batch } from '../entities/Batch';

export interface IBatchRepository {
    findById(id: string): Promise<Batch | null>;
    findByCollegeId(collegeId: string): Promise<Batch[]>;
    findByDepartmentId(departmentId: string): Promise<Batch[]>;
    create(batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Batch>;
    update(id: string, data: Partial<Batch>): Promise<Batch>;
    delete(id: string): Promise<boolean>;
    promoteBatch(batchId: string): Promise<Batch>;
}
