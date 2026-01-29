import { Course } from '../entities/Course';

export interface ICourseRepository {
    findById(id: string): Promise<Course | null>;
    findByCollegeId(collegeId: string, page?: number, limit?: number): Promise<{ items: Course[], total: number }>;
    findByDepartmentId(departmentId: string, page?: number, limit?: number): Promise<{ items: Course[], total: number }>;
    create(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'toJSON'>): Promise<Course>;
    update(id: string, data: Partial<Course>): Promise<Course>;
    delete(id: string): Promise<boolean>;
}
