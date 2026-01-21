import { ConstraintRule } from '../entities/ConstraintRule';

export interface IConstraintRepository {
    findAll(): Promise<ConstraintRule[]>;
    findByDepartment(departmentId: string): Promise<ConstraintRule[]>;
}
