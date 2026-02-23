export { Department } from './domain/entities/Department';
export type { IDepartmentRepository } from './domain/repositories/IDepartmentRepository';
export { CreateDepartmentUseCase } from './application/use-cases/CreateDepartmentUseCase';
export { GetDepartmentsByCollegeUseCase } from './application/use-cases/GetDepartmentsByCollegeUseCase';
export type { CreateDepartmentDto } from './application/dto/CreateDepartmentDto';
export { CreateDepartmentDtoSchema } from './application/dto/CreateDepartmentDto';
export { SupabaseDepartmentRepository } from './infrastructure/persistence/SupabaseDepartmentRepository';
