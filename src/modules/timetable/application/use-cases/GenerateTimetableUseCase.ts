import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';
import { GenerateTimetableDto } from '../dto/TimetableDto';

export class GenerateTimetableUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(dto: GenerateTimetableDto) {
        const timetable = await this.timetableRepository.create({
            departmentId: dto.department_id,
            batchId: dto.batch_id,
            semester: dto.semester,
            academicYear: dto.academic_year,
            status: 'draft',
            createdBy: dto.created_by,
            publishedAt: null
        });
        return timetable.toJSON();
    }
}
