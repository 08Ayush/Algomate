import { IConstraintRepository } from '../../domain/repositories/IConstraintRepository';

export class GetConstraintRulesUseCase {
    constructor(private readonly constraintRepository: IConstraintRepository) { }

    async execute(departmentId?: string) {
        if (departmentId) {
            return await this.constraintRepository.findByDepartment(departmentId);
        }
        return await this.constraintRepository.findAll();
    }
}
