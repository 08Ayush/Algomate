export interface DashboardStats {
    activeTimetables: number;
    avgFitnessScore: number;
    facultyCount: number;
    avgGenerationTime: string;
    totalClassesScheduled: number;
    conflictResolutionRate: number;
    roomUtilization: number;
    facultySatisfaction: number;
}

export interface RecentActivity {
    id: string;
    type: 'timetable_published' | 'modification_request' | 'optimization_completed';
    title: string;
    description: string;
    created_at: string;
}

export interface RecentTimetable {
    id: string;
    title: string;
    status: string;
    created_at: string;
    batch_name: string;
}
