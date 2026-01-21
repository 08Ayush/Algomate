import { IFacultyRepository } from '../../domain/repositories/IFacultyRepository';

export class GetFacultyByDepartmentUseCase {
    constructor(private readonly facultyRepository: IFacultyRepository) { }

    async execute(departmentId: string) {
        const faculty = await this.facultyRepository.findByDepartment(departmentId);
        return faculty.map(f => f.toJSON());
    }
}
