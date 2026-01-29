import { Department } from '../entities/Department';

export interface IDepartmentRepository {
    findById(id: string): Promise<Department | null>;
    findAll(): Promise<Department[]>;
    findByCollege(collegeId: string, page?: number, limit?: number): Promise<{ items: Department[]; total: number }>;
    create(department: Pick<Department, 'name' | 'code' | 'collegeId' | 'description'>): Promise<Department>;
    update(id: string, data: Partial<Department>): Promise<Department>;
    delete(id: string): Promise<boolean>;
    countByCollege(collegeId: string): Promise<number>;
}
