import { Batch } from '../entities/Batch';

export interface IBatchRepository {
    findById(id: string): Promise<Batch | null>;
    findByCollege(collegeId: string): Promise<Batch[]>;
    findByDepartment(departmentId: string): Promise<Batch[]>;
    findActive(collegeId?: string, departmentId?: string): Promise<Batch[]>;
    create(batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Batch>;
    update(id: string, data: Partial<Batch>): Promise<Batch>;
    delete(id: string): Promise<boolean>;
}
