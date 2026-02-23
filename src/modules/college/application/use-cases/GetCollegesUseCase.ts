import { ICollegeRepository } from '../../domain/repositories/ICollegeRepository';

export class GetCollegesUseCase {
    constructor(private readonly collegeRepository: ICollegeRepository) { }

    async execute() {
        const colleges = await this.collegeRepository.findAll();
        return colleges.map(c => c.toJSON());
    }
}
