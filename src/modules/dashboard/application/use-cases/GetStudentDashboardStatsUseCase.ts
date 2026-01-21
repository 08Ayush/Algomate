import { IDashboardQueryService } from '../../domain/ports/IDashboardQueryService';

export class GetStudentDashboardStatsUseCase {
    constructor(private readonly queryService: IDashboardQueryService) { }

    async execute(userId: string, courseId: string, semester: number, collegeId: string) {
        return this.queryService.getStudentDashboardData(userId, courseId, semester, collegeId);
    }
}
