import { StudentChoice } from '../entities/StudentChoice';

export interface IStudentChoiceRepository {
    findByStudentId(studentId: string): Promise<StudentChoice[]>;
    findByBucketId(bucketId: string): Promise<StudentChoice[]>;
    create(choice: Omit<StudentChoice, 'id' | 'createdAt'>): Promise<StudentChoice>;
    createMany(choices: Omit<StudentChoice, 'id' | 'createdAt'>[]): Promise<StudentChoice[]>;
    updateStatus(id: string, status: 'pending' | 'allocated' | 'rejected'): Promise<StudentChoice>;
    delete(id: string): Promise<boolean>;
    deleteByStudentId(studentId: string): Promise<boolean>;
}
