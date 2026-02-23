import { IDepartmentRepository } from '../../domain/repositories/IDepartmentRepository';
import { CreateDepartmentDto } from '../dto/CreateDepartmentDto';

export class CreateDepartmentUseCase {
    constructor(private readonly departmentRepository: IDepartmentRepository) { }

    async execute(dto: CreateDepartmentDto) {
        const department = await this.departmentRepository.create({
            name: dto.name,
            code: dto.code,
            description: dto.description || null,
            collegeId: dto.college_id
        });
        return department.toJSON();
    }
}
