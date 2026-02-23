import { IFacultyRepository } from '../../domain/repositories/IFacultyRepository';
import { CreateFacultyDto } from '../dto/FacultyDto';

export class CreateFacultyUseCase {
    constructor(private readonly facultyRepository: IFacultyRepository) { }

    async execute(dto: CreateFacultyDto) {
        const faculty = await this.facultyRepository.create({
            userId: dto.user_id,
            departmentId: dto.department_id,
            facultyType: dto.faculty_type,
            specialization: dto.specialization || null,
            experience: dto.experience || null
        });
        return faculty.toJSON();
    }
}
