import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository';
import { CreateSubjectDto } from '../dto/SubjectDto';

export class CreateSubjectUseCase {
    constructor(private readonly subjectRepository: ISubjectRepository) { }

    async execute(dto: CreateSubjectDto) {
        const subject = await this.subjectRepository.create({
            name: dto.name,
            code: dto.code,
            credits: dto.credits,
            category: dto.category,
            semester: dto.semester,
            departmentId: dto.department_id
        });
        return subject.toJSON();
    }
}
