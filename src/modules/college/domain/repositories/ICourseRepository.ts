import { Course } from '../entities/Course';

export interface ICourseRepository {
    findById(id: string): Promise<Course | null>;
    findAll(): Promise<Course[]>;
    findByCollege(collegeId: string): Promise<Course[]>;
}
