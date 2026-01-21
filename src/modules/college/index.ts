export { College } from './domain/entities/College';
export type { ICollegeRepository } from './domain/repositories/ICollegeRepository';
export { CreateCollegeUseCase } from './application/use-cases/CreateCollegeUseCase';
export { GetCollegesUseCase } from './application/use-cases/GetCollegesUseCase';
export type { CreateCollegeDto } from './application/dto/CreateCollegeDto';
export { CreateCollegeDtoSchema } from './application/dto/CreateCollegeDto';
export { SupabaseCollegeRepository } from './infrastructure/persistence/SupabaseCollegeRepository';
