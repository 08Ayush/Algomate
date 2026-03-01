import { ITimetableRepository } from '../../domain/repositories/ITimetableRepository';
import { GenerateTimetableDto } from '../dto/TimetableDto';

export class GenerateTimetableUseCase {
    constructor(private readonly timetableRepository: ITimetableRepository) { }

    async execute(dto: GenerateTimetableDto) {
        const timetable = await this.timetableRepository.create({
            title: `Timetable - ${dto.department_id} - ${dto.academic_year} Sem ${dto.semester}`,
            departmentId: dto.department_id,
            batchId: dto.batch_id,
            collegeId: dto.college_id ?? '',
            semester: dto.semester,
            academicYear: dto.academic_year,
            fitnessScore: 0,
            constraintViolations: [],
            generationMethod: 'auto',
            status: 'draft',
            createdBy: dto.created_by,
            publishedAt: null,
            toJSON: function () { return {}; }
        } as any);
        return timetable.toJSON();
    }
}
