import { College } from '../entities/College';

export interface ICollegeRepository {
    findById(id: string): Promise<College | null>;
    findAll(): Promise<College[]>;
    findByCode(code: string): Promise<College | null>;
    create(college: Pick<College, 'name' | 'code' | 'address'>): Promise<College>;
    update(id: string, data: Partial<College>): Promise<College>;
    delete(id: string): Promise<boolean>;
    codeExists(code: string): Promise<boolean>;
}
