import { Faculty, FacultyQualification } from '../entities/Faculty';

export interface IFacultyRepository {
    findById(id: string): Promise<Faculty | null>;
    findByUserId(userId: string): Promise<Faculty | null>;
    findByDepartment(departmentId: string): Promise<Faculty[]>;
    create(faculty: Omit<Faculty, 'id' | 'createdAt' | 'updatedAt'>): Promise<Faculty>;
    update(id: string, data: Partial<Faculty>): Promise<Faculty>;
    delete(id: string): Promise<boolean>;
    countByDepartment(departmentId: string): Promise<number>;
}

export interface IFacultyQualificationRepository {
    findById(id: string): Promise<FacultyQualification | null>;
    findByFaculty(facultyId: string): Promise<FacultyQualification[]>;
    findBySubject(subjectId: string): Promise<FacultyQualification[]>;
    create(qualification: Omit<FacultyQualification, 'id' | 'createdAt'>): Promise<FacultyQualification>;
    delete(id: string): Promise<boolean>;
}
