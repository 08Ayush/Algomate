import { Classroom } from '../entities/Classroom';

export interface IClassroomRepository {
    findById(id: string): Promise<Classroom | null>;
    findByCollegeId(collegeId: string): Promise<Classroom[]>;
    findByDepartmentId(departmentId: string): Promise<Classroom[]>;
    create(classroom: Omit<Classroom, 'id' | 'createdAt' | 'updatedAt'>): Promise<Classroom>;
    update(id: string, data: Partial<Classroom>): Promise<Classroom>;
    delete(id: string): Promise<boolean>;
}
