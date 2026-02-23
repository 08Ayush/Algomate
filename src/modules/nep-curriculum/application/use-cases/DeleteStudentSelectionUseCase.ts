import { IStudentCourseSelectionRepository } from '../../domain/repositories/IStudentCourseSelectionRepository';

export class DeleteStudentSelectionUseCase {
    constructor(private readonly selectionRepository: IStudentCourseSelectionRepository) { }

    async execute(studentId: string, subjectId: string): Promise<void> {
        // Logic to check if locked is handled in Repo/DB triggers mostly? 
        // Or we should check here? Route checks here.
        // "Cannot delete locked MAJOR subject"

        // We need to fetch the selection first to check checks
        // Use findExistingSelection with tighter params? Or assume we have semester from somewhere?
        // Route receives student_id and subject_id ONLY in DELETE.
        // So we need to find the selection by these two params to check semester/lock status.

        // Use repo method findByStudent and filter in memory? Or add findByStudentAndSubject?
        // Let's assume repo needs findByStudentAndSubject or we scan 'findByStudent' output.

        const selections = await this.selectionRepository.findByStudent(studentId);
        const selection = selections.find(s => s.subjectId === subjectId);

        if (!selection) {
            throw new Error('Selection not found');
        }

        if (selection.selectionType === 'MAJOR' && selection.isLocked) {
            throw new Error(`Cannot delete locked MAJOR subject. MAJOR selections are permanent from Semester ${selection.semester} onwards.`);
        }

        if (selection.selectionType === 'CORE') {
            throw new Error('Cannot delete core/mandatory subjects.');
        }

        await this.selectionRepository.delete(studentId, subjectId);
    }
}
