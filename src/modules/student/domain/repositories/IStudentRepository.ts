import { Student, Batch } from '../entities/Student';

export interface IStudentRepository {
    findById(id: string): Promise<Student | null>;
    findByUserId(userId: string): Promise<Student | null>;
    findByBatch(batchId: string): Promise<Student[]>;
    create(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>;
    update(id: string, data: Partial<Student>): Promise<Student>;
    delete(id: string): Promise<boolean>;
    countByBatch(batchId: string): Promise<number>;
}

export interface IBatchRepository {
    findById(id: string): Promise<Batch | null>;
    findByDepartment(departmentId: string): Promise<Batch[]>;
    create(batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Promise<Batch>;
    update(id: string, data: Partial<Batch>): Promise<Batch>;
    delete(id: string): Promise<boolean>;
}
