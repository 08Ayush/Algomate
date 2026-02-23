// Types
export * from './domain/entities/DashboardTypes';

// Ports
export type { IDashboardQueryService } from './domain/ports/IDashboardQueryService';

// Infrastructure
export { SupabaseDashboardQueryService } from './infrastructure/query/SupabaseDashboardQueryService';

// Use Cases
export { GetFacultyDashboardStatsUseCase } from './application/use-cases/GetFacultyDashboardStatsUseCase';
export { GetStudentDashboardStatsUseCase } from './application/use-cases/GetStudentDashboardStatsUseCase';
