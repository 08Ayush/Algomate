import { IClassroomRepository } from '../../domain/repositories/IClassroomRepository';

export class GetClassroomsUseCase {
    constructor(private readonly classroomRepository: IClassroomRepository) { }

    async execute(collegeId?: string, departmentId?: string, page?: number, limit?: number) {
        let result;

        if (departmentId) {
            result = await this.classroomRepository.findByDepartmentId(departmentId, page, limit);
        } else if (collegeId) {
            result = await this.classroomRepository.findByCollegeId(collegeId, page, limit);
        } else {
            throw new Error('Either collegeId or departmentId must be provided');
        }

        return {
            success: true,
            classrooms: result.items.map(c => c.toJSON()),
            total: result.total
        };
    }
}
