import { ICourseRepository } from '../../domain/repositories/ICourseRepository';

export class GetCoursesUseCase {
    constructor(private readonly courseRepository: ICourseRepository) { }

    async execute(collegeId?: string, departmentId?: string, page?: number, limit?: number) {
        let result;

        if (departmentId) {
            result = await this.courseRepository.findByDepartmentId(departmentId, page, limit);
        } else if (collegeId) {
            result = await this.courseRepository.findByCollegeId(collegeId, page, limit);
        } else {
            throw new Error('Either collegeId or departmentId must be provided');
        }

        return {
            success: true,
            courses: result.items.map(c => c.toJSON()),
            total: result.total
        };
    }
}
