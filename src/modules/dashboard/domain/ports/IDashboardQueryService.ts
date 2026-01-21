import { DashboardStats, RecentActivity, RecentTimetable } from '../entities/DashboardTypes';

export interface IDashboardQueryService {
    getFacultyStats(userId: string, departmentId: string, facultyType: string): Promise<DashboardStats>;
    getRecentTimetables(userId: string, departmentId: string, facultyType: string): Promise<RecentTimetable[]>;
    getRecentActivities(userId: string): Promise<RecentActivity[]>;
    getPendingReviewCount(userId: string, departmentId: string, facultyType: string): Promise<number>;
    getStudentDashboardData(userId: string, courseId: string, semester: number, collegeId: string): Promise<any>;
}
