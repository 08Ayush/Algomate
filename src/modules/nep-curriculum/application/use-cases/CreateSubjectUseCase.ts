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
            departmentId: dto.department_id,
            domain: null,
            toJSON() {
                return {
                    id: '',
                    name: this.name,
                    code: this.code,
                    credits: this.credits,
                    category: this.category,
                    semester: this.semester,
                    department_id: this.departmentId,
                    domain: this.domain,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
            }
        });
        return subject.toJSON();
    }
}
