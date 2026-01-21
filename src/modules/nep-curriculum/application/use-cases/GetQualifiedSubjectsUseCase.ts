import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository';
import { Subject } from '../../domain/entities/Subject';

export class GetQualifiedSubjectsUseCase {
    constructor(private readonly subjectRepository: ISubjectRepository) { }

    async execute(facultyId: string): Promise<Subject[]> {
        return this.subjectRepository.findQualifiedSubjects(facultyId);
    }
}
