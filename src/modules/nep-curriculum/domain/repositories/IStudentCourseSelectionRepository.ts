import { StudentCourseSelection } from '../entities/StudentCourseSelection';

export interface IStudentCourseSelectionRepository {
    findByStudent(studentId: string, semester?: number, academicYear?: string): Promise<StudentCourseSelection[]>;
    findExistingSelection(studentId: string, subjectId: string, semester: number, academicYear: string): Promise<StudentCourseSelection | null>;
    findMajors(studentId: string): Promise<StudentCourseSelection[]>;
    create(selection: Omit<StudentCourseSelection, 'id' | 'createdAt' | 'isLocked' | 'lockedAt'>): Promise<StudentCourseSelection>;
    delete(studentId: string, subjectId: string): Promise<boolean>;
    findById(id: string): Promise<StudentCourseSelection | null>;
}
