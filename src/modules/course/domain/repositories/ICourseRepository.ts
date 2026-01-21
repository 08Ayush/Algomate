import { Course } from '../entities/Course';

export interface ICourseRepository {
    findById(id: string): Promise<Course | null>;
    findByCollegeId(collegeId: string): Promise<Course[]>;
    findByDepartmentId(departmentId: string): Promise<Course[]>;
    create(course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>): Promise<Course>;
    update(id: string, data: Partial<Course>): Promise<Course>;
    delete(id: string): Promise<boolean>;
}
