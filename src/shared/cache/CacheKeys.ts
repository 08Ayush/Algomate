/**
 * Cache key patterns for different entities
 */
export const CacheKeys = {
    // Courses
    COURSE_BY_ID: (id: string) => `course:${id}`,
    COURSES_BY_COLLEGE: (collegeId: string) => `courses:college:${collegeId}`,
    COURSES_BY_DEPARTMENT: (deptId: string) => `courses:dept:${deptId}`,

    // Departments
    DEPARTMENT_BY_ID: (id: string) => `department:${id}`,
    DEPARTMENTS_BY_COLLEGE: (collegeId: string) => `departments:college:${collegeId}`,

    // Batches
    BATCH_BY_ID: (id: string) => `batch:${id}`,
    BATCHES_BY_COLLEGE: (collegeId: string) => `batches:college:${collegeId}`,
    BATCHES_BY_DEPARTMENT: (deptId: string) => `batches:dept:${deptId}`,

    // Elective Buckets
    BUCKET_BY_ID: (id: string) => `bucket:${id}`,
    BUCKETS_BY_BATCH: (batchId: string) => `buckets:batch:${batchId}`,
    BUCKETS_BY_COLLEGE: (collegeId: string) => `buckets:college:${collegeId}`,

    // Classrooms
    CLASSROOM_BY_ID: (id: string) => `classroom:${id}`,
    CLASSROOMS_BY_COLLEGE: (collegeId: string) => `classrooms:college:${collegeId}`,
    CLASSROOMS_BY_DEPARTMENT: (deptId: string) => `classrooms:dept:${deptId}`,

    // Timetables
    TIMETABLE_BY_ID: (id: string) => `timetable:${id}`,
    TIMETABLES_BY_BATCH: (batchId: string) => `timetables:batch:${batchId}`,
    REVIEW_QUEUE: (deptId: string) => `timetables:review:dept:${deptId}`,

    // Pattern matchers for cache invalidation
    PATTERNS: {
        ALL_COURSES: 'course*',
        ALL_DEPARTMENTS: 'department*',
        ALL_BATCHES: 'batch*',
        ALL_BUCKETS: 'bucket*',
        ALL_CLASSROOMS: 'classroom*',
        ALL_TIMETABLES: 'timetable*',
        BY_COLLEGE: (collegeId: string) => `*:college:${collegeId}`,
        BY_DEPARTMENT: (deptId: string) => `*:dept:${deptId}`,
    },
} as const;

/**
 * Default TTL values (in seconds)
 */
export const CacheTTL = {
    SHORT: 60, // 1 minute - for frequently changing data
    MEDIUM: 300, // 5 minutes - default
    LONG: 3600, // 1 hour - for rarely changing data
    VERY_LONG: 86400, // 24 hours - for static data
} as const;
