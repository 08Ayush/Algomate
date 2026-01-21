/**
 * Route Constants
 * 
 * Centralized route definitions for the application
 */

/**
 * API Routes
 * Backend API endpoint paths
 */
export const API_ROUTES = {
    // Authentication
    AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        REFRESH: '/api/auth/refresh'
    },

    // Admin routes
    ADMIN: {
        DASHBOARD: '/api/admin/dashboard',
        DEPARTMENTS: '/api/admin/departments',
        FACULTY: '/api/admin/faculty',
        STUDENTS: '/api/admin/students',
        SUBJECTS: '/api/admin/subjects',
        BATCHES: '/api/admin/batches',
        CLASSROOMS: '/api/admin/classrooms',
        COURSES: '/api/admin/courses'
    },

    // Faculty routes
    FACULTY: {
        DASHBOARD: '/api/faculty/dashboard',
        TIMETABLES: '/api/faculty/timetables',
        QUALIFICATIONS: '/api/faculty/qualifications',
        SUBJECTS: '/api/faculty/subjects',
        BATCHES: '/api/faculty/batches',
        EVENTS: '/api/faculty/events'
    },

    // Student routes
    STUDENT: {
        DASHBOARD: '/api/student/dashboard',
        SELECTIONS: '/api/student/selections',
        AVAILABLE_SUBJECTS: '/api/student/available-subjects',
        TIMETABLE: '/api/student/timetable'
    },

    // Timetable routes
    TIMETABLE: {
        GENERATE: '/api/timetable/generate',
        PUBLISH: '/api/timetables/publish',
        LIST: '/api/timetables',
        DETAIL: (id: string) => `/api/timetables/${id}`
    },

    // NEP Curriculum routes
    NEP: {
        BUCKETS: '/api/elective-buckets',
        SUBJECTS: '/api/nep-subjects',
        SCHEDULER: '/api/nep-scheduler'
    },

    // Events routes
    EVENTS: {
        LIST: '/api/events',
        DETAIL: (id: string) => `/api/events/${id}`,
        REGISTRATIONS: '/api/event-registrations'
    },

    // Notifications routes
    NOTIFICATIONS: {
        LIST: '/api/notifications',
        MARK_READ: (id: string) => `/api/notifications/${id}/read`
    },

    // Constraints routes
    CONSTRAINTS: {
        LIST: '/api/constraints',
        CREATE: '/api/constraints'
    }
} as const;

/**
 * Frontend Routes
 * Client-side page paths
 */
export const FRONTEND_ROUTES = {
    // Public routes
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',

    // Super Admin routes
    SUPER_ADMIN: {
        DASHBOARD: '/super-admin/dashboard',
        MANAGE: '/super-admin/manage'
    },

    // Admin routes
    ADMIN: {
        DASHBOARD: '/admin/dashboard',
        DEPARTMENTS: '/admin/departments',
        FACULTY: '/admin/faculty',
        STUDENTS: '/admin/students',
        SUBJECTS: '/admin/subjects',
        BATCHES: '/admin/batches',
        CLASSROOMS: '/admin/classrooms',
        BUCKET_CREATOR: '/admin/bucket_creator',
        NEP_CURRICULUM: '/admin/nep-curriculum'
    },

    // Faculty routes
    FACULTY: {
        DASHBOARD: '/faculty/dashboard',
        AI_TIMETABLE_CREATOR: '/faculty/ai-timetable-creator',
        MANUAL_SCHEDULING: '/faculty/manual-scheduling',
        HYBRID_SCHEDULER: '/faculty/hybrid-scheduler',
        TIMETABLES: '/faculty/timetables',
        SUBJECTS: '/faculty/subjects',
        BATCHES: '/faculty/batches',
        CLASSROOMS: '/faculty/classrooms',
        QUALIFICATIONS: '/faculty/qualifications',
        NEP_CURRICULUM: '/faculty/nep-curriculum',
        REVIEW_QUEUE: '/faculty/review-queue',
        EVENTS: '/faculty/events',
        NOTIFICATIONS: '/faculty/notifications',
        SETTINGS: '/faculty/settings'
    },

    // Student routes
    STUDENT: {
        DASHBOARD: '/student/dashboard'
    }
} as const;

/**
 * Get route by role
 * Returns the default dashboard route for a given role
 */
export function getDefaultRouteForRole(role: string): string {
    switch (role) {
        case 'super_admin':
            return FRONTEND_ROUTES.SUPER_ADMIN.DASHBOARD;
        case 'college_admin':
        case 'admin':
            return FRONTEND_ROUTES.ADMIN.DASHBOARD;
        case 'faculty':
            return FRONTEND_ROUTES.FACULTY.DASHBOARD;
        case 'student':
            return FRONTEND_ROUTES.STUDENT.DASHBOARD;
        default:
            return FRONTEND_ROUTES.HOME;
    }
}

/**
 * Check if route is public (doesn't require authentication)
 */
export function isPublicRoute(path: string): boolean {
    const publicRoutes = [
        FRONTEND_ROUTES.HOME,
        FRONTEND_ROUTES.LOGIN,
        FRONTEND_ROUTES.REGISTER,
        FRONTEND_ROUTES.FORGOT_PASSWORD
    ];
    return publicRoutes.includes(path);
}

/**
 * Check if route is admin route
 */
export function isAdminRoute(path: string): boolean {
    return path.startsWith('/admin') || path.startsWith('/super-admin');
}

/**
 * Check if route is faculty route
 */
export function isFacultyRoute(path: string): boolean {
    return path.startsWith('/faculty');
}

/**
 * Check if route is student route
 */
export function isStudentRoute(path: string): boolean {
    return path.startsWith('/student');
}
