// Domain
export { Classroom } from './domain/entities/Classroom';

// Repositories
export type { IClassroomRepository } from './domain/repositories/IClassroomRepository';

// Infrastructure
export { SupabaseClassroomRepository } from './infrastructure/persistence/SupabaseClassroomRepository';

// DTOs
export { CreateClassroomDtoSchema } from './application/dto/ClassroomDto';
export type { CreateClassroomDto } from './application/dto/ClassroomDto';

// Use Cases
export { CreateClassroomUseCase } from './application/use-cases/CreateClassroomUseCase';
export { GetClassroomsUseCase } from './application/use-cases/GetClassroomsUseCase';
