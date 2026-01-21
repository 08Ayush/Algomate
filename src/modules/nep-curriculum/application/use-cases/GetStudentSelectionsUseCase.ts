import { IStudentCourseSelectionRepository } from '../../domain/repositories/IStudentCourseSelectionRepository';
import { ISubjectRepository } from '../../domain/repositories/ISubjectRepository';
import { StudentCourseSelection } from '../../domain/entities/StudentCourseSelection';

export class GetStudentSelectionsUseCase {
    constructor(
        private readonly selectionRepository: IStudentCourseSelectionRepository,
        private readonly subjectRepository: ISubjectRepository
    ) { }

    async execute(studentId: string, semester?: number, academicYear?: string): Promise<any[]> {
        const selections = await this.selectionRepository.findByStudent(studentId, semester, academicYear);

        // Enrich with subject details
        // Optimization: Could cache subjects or batch fetch if needed.
        // For N ~ 5-10, Promise.all is fine.

        return Promise.all(selections.map(async (sel) => {
            const subject = await this.subjectRepository.findById(sel.subjectId);
            return {
                ...sel.toJSON(),
                subject: subject ? subject.toJSON() : null
            };
        }));
    }
}
