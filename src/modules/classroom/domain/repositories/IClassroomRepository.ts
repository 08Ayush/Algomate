import { Classroom } from '../entities/Classroom';

export interface IClassroomRepository {
    findById(id: string): Promise<Classroom | null>;
    findByCollegeId(collegeId: string, page?: number, limit?: number): Promise<{ items: Classroom[], total: number }>;
    findByDepartmentId(departmentId: string, page?: number, limit?: number): Promise<{ items: Classroom[], total: number }>;
    create(classroom: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt' | 'toJSON'>): Promise<Classroom>;
    update(id: string, data: Partial<Classroom>): Promise<Classroom>;
    delete(id: string): Promise<boolean>;
}
