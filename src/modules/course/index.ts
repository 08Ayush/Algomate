// Domain
export { Course } from './domain/entities/Course';

// Repositories
export type { ICourseRepository } from './domain/repositories/ICourseRepository';

// Infrastructure
export { SupabaseCourseRepository } from './infrastructure/persistence/SupabaseCourseRepository';

// DTOs
export { CreateCourseDtoSchema } from './application/dto/CourseDto';
export type { CreateCourseDto } from './application/dto/CourseDto';

// Use Cases
export { CreateCourseUseCase } from './application/use-cases/CreateCourseUseCase';
export { GetCoursesUseCase } from './application/use-cases/GetCoursesUseCase';
