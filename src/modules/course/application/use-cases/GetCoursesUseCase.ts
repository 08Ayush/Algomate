import { ICourseRepository } from '../../domain/repositories/ICourseRepository';

export class GetCoursesUseCase {
    constructor(private readonly courseRepository: ICourseRepository) { }

    async execute(collegeId?: string, departmentId?: string) {
        let courses;

        if (departmentId) {
            courses = await this.courseRepository.findByDepartmentId(departmentId);
        } else if (collegeId) {
            courses = await this.courseRepository.findByCollegeId(collegeId);
        } else {
            throw new Error('Either collegeId or departmentId must be provided');
        }

        return {
            success: true,
            courses: courses.map(c => c.toJSON())
        };
    }
}
