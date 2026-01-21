import { IClassroomRepository } from '../../domain/repositories/IClassroomRepository';
import { CreateClassroomDto } from '../dto/ClassroomDto';

export class CreateClassroomUseCase {
    constructor(private readonly classroomRepository: IClassroomRepository) { }

    async execute(dto: CreateClassroomDto) {
        const classroom = await this.classroomRepository.create({
            name: dto.name,
            collegeId: dto.college_id,
            departmentId: dto.department_id || null,
            capacity: dto.capacity,
            type: dto.type,
            hasProjector: dto.has_projector,
            hasComputers: dto.has_computers,
            isActive: dto.is_active
        });

        return {
            success: true,
            message: 'Classroom created successfully',
            classroom: classroom.toJSON()
        };
    }
}
