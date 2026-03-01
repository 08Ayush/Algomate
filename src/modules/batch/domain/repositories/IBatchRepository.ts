import { Batch } from '../entities/Batch';

export interface CreateBatchData {
    name: string;
    collegeId: string;
    departmentId: string;
    courseId: string | null;
    semester: number;
    section: string | null;
    academicYear: string;
    isActive: boolean;
}

export interface IBatchRepository {
    findById(id: string): Promise<Batch | null>;
    findByCollegeId(collegeId: string): Promise<Batch[]>;
    findByDepartmentId(departmentId: string): Promise<Batch[]>;
    create(batch: CreateBatchData): Promise<Batch>;
    update(id: string, data: Partial<Batch>): Promise<Batch>;
    delete(id: string): Promise<boolean>;
    promoteBatch(batchId: string): Promise<Batch>;
}
