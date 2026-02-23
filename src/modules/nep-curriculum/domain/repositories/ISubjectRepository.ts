import { Subject, ElectiveBucket } from '../entities/Subject';

export interface ISubjectRepository {
    findById(id: string): Promise<Subject | null>;
    findByDepartment(departmentId: string): Promise<Subject[]>;
    findBySemester(departmentId: string, semester: number): Promise<Subject[]>;
    findQualifiedSubjects(facultyId: string): Promise<Subject[]>;
    create(subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subject>;
    update(id: string, data: Partial<Subject>): Promise<Subject>;
    delete(id: string): Promise<boolean>;
}

export interface IElectiveBucketRepository {
    findById(id: string): Promise<ElectiveBucket | null>;
    findByDepartment(departmentId: string): Promise<ElectiveBucket[]>;
    create(bucket: Omit<ElectiveBucket, 'id' | 'createdAt'>): Promise<ElectiveBucket>;
    delete(id: string): Promise<boolean>;
}
