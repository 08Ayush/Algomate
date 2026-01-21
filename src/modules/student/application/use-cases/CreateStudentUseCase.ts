import { IStudentRepository } from '../../domain/repositories/IStudentRepository';
import { CreateStudentDto } from '../dto/StudentDto';

export class CreateStudentUseCase {
    constructor(private readonly studentRepository: IStudentRepository) { }

    async execute(dto: CreateStudentDto) {
        const student = await this.studentRepository.create({
            userId: dto.user_id,
            batchId: dto.batch_id,
            rollNumber: dto.roll_number,
            enrollmentYear: dto.enrollment_year
        });
        return student.toJSON();
    }
}
