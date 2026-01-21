import { ICourseRepository } from '../../domain/repositories/ICourseRepository';
import { CreateCourseDto } from '../dto/CourseDto';

export class CreateCourseUseCase {
    constructor(private readonly courseRepository: ICourseRepository) { }

    async execute(dto: CreateCourseDto) {
        const course = await this.courseRepository.create({
            title: dto.title,
            code: dto.code,
            collegeId: dto.college_id,
            departmentId: dto.department_id || null,
            duration: dto.duration,
            isActive: dto.is_active
        });

        return {
            success: true,
            message: 'Course created successfully',
            course: course.toJSON()
        };
    }
}
