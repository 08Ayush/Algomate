import { ICollegeRepository } from '../../domain/repositories/ICollegeRepository';
import { CreateCollegeDto } from '../dto/CreateCollegeDto';
import { ConflictError } from '@/shared/middleware/error-handler';

export class CreateCollegeUseCase {
    constructor(private readonly collegeRepository: ICollegeRepository) { }

    async execute(dto: CreateCollegeDto) {
        const exists = await this.collegeRepository.codeExists(dto.code);
        if (exists) {
            throw new ConflictError('College code already exists');
        }

        const college = await this.collegeRepository.create(dto);
        return college.toJSON();
    }
}
