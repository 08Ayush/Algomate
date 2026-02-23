import { IDepartmentRepository } from '../../domain/repositories/IDepartmentRepository';

export class GetDepartmentsByCollegeUseCase {
    constructor(private readonly departmentRepository: IDepartmentRepository) { }

    async execute(collegeId: string, page?: number, limit?: number) {
        const result = await this.departmentRepository.findByCollege(collegeId, page, limit);
        return {
            departments: result.items.map(d => d.toJSON()),
            total: result.total
        };
    }
}
