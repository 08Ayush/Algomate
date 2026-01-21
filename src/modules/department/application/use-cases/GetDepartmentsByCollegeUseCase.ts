import { IDepartmentRepository } from '../../domain/repositories/IDepartmentRepository';

export class GetDepartmentsByCollegeUseCase {
    constructor(private readonly departmentRepository: IDepartmentRepository) { }

    async execute(collegeId: string) {
        const departments = await this.departmentRepository.findByCollege(collegeId);
        return departments.map(d => d.toJSON());
    }
}
