import { IFacultyQualificationRepository } from '../../domain/repositories/IFacultyRepository';
import { AssignQualificationDto } from '../dto/FacultyDto';

export class AssignQualificationUseCase {
    constructor(private readonly qualificationRepository: IFacultyQualificationRepository) { }

    async execute(dto: AssignQualificationDto) {
        const qualification = await this.qualificationRepository.create({
            facultyId: dto.faculty_id,
            subjectId: dto.subject_id,
            qualificationLevel: dto.qualification_level,
            yearsOfExperience: dto.years_of_experience
        });
        return qualification.toJSON();
    }
}
