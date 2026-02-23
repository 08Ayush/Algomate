export { Faculty, FacultyQualification } from './domain/entities/Faculty';
export type { IFacultyRepository, IFacultyQualificationRepository } from './domain/repositories/IFacultyRepository';
export { CreateFacultyUseCase } from './application/use-cases/CreateFacultyUseCase';
export { AssignQualificationUseCase } from './application/use-cases/AssignQualificationUseCase';
export { GetFacultyByDepartmentUseCase } from './application/use-cases/GetFacultyByDepartmentUseCase';
export type { CreateFacultyDto, AssignQualificationDto } from './application/dto/FacultyDto';
export { CreateFacultyDtoSchema, AssignQualificationDtoSchema } from './application/dto/FacultyDto';
export { SupabaseFacultyRepository, SupabaseFacultyQualificationRepository } from './infrastructure/persistence/SupabaseFacultyRepository';
