import { IClassroomRepository } from '../../domain/repositories/IClassroomRepository';

export class GetClassroomsUseCase {
    constructor(private readonly classroomRepository: IClassroomRepository) { }

    async execute(collegeId?: string, departmentId?: string) {
        let classrooms;

        if (departmentId) {
            classrooms = await this.classroomRepository.findByDepartmentId(departmentId);
        } else if (collegeId) {
            classrooms = await this.classroomRepository.findByCollegeId(collegeId);
        } else {
            throw new Error('Either collegeId or departmentId must be provided');
        }

        return {
            success: true,
            classrooms: classrooms.map(c => c.toJSON())
        };
    }
}
