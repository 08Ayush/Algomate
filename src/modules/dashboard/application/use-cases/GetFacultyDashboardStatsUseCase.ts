import { IDashboardQueryService } from '../../domain/ports/IDashboardQueryService';
import { DashboardStats, RecentTimetable, RecentActivity } from '../../domain/entities/DashboardTypes';

export class GetFacultyDashboardStatsUseCase {
    constructor(private readonly queryService: IDashboardQueryService) { }

    async execute(userId: string, departmentId: string, facultyType: string, options: { includeStats?: boolean, includeRecent?: boolean } = { includeStats: true, includeRecent: true }) {
        const promises: Promise<any>[] = [];

        // Index 0: Stats
        if (options.includeStats) {
            promises.push(this.queryService.getFacultyStats(userId, departmentId, facultyType));
        } else {
            promises.push(Promise.resolve(null));
        }

        // Index 1: Timetables
        if (options.includeRecent) {
            promises.push(this.queryService.getRecentTimetables(userId, departmentId, facultyType));
        } else {
            promises.push(Promise.resolve([]));
        }

        // Index 2: Activities
        if (options.includeRecent) {
            promises.push(this.queryService.getRecentActivities(userId));
        } else {
            promises.push(Promise.resolve([]));
        }

        // Index 3: Pending Reviews
        if (options.includeRecent) {
            promises.push(this.queryService.getPendingReviewCount(userId, departmentId, facultyType));
        } else {
            promises.push(Promise.resolve(0));
        }

        const [stats, timetables, activities, pendingReviews] = await Promise.all(promises);

        return {
            stats,
            recentTimetables: timetables,
            recentActivities: activities,
            pendingReviewCount: pendingReviews
        };
    }
}
