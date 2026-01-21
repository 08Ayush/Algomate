import { IBatchRepository } from '../../domain/repositories/IBatchRepository';
import { CreateBatchDto } from '../dto/BatchDto';

export class CreateBatchUseCase {
    constructor(private readonly batchRepository: IBatchRepository) { }

    async execute(dto: CreateBatchDto) {
        const batch = await this.batchRepository.create({
            name: dto.name,
            collegeId: dto.college_id,
            departmentId: dto.department_id,
            courseId: dto.course_id || null,
            semester: dto.semester,
            section: dto.section || null,
            academicYear: dto.academic_year,
            isActive: dto.is_active
        });

        return {
            success: true,
            message: 'Batch created successfully',
            batch: batch.toJSON()
        };
    }
}
