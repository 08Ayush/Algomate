import { UserRole, FacultyType } from '@/shared/types/user';

/**
 * Role Constants
 * 
 * Definitions and utilities for user roles and permissions
 */

/**
 * Role Hierarchy
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 5,
    [UserRole.COLLEGE_ADMIN]: 4,
    [UserRole.ADMIN]: 3,
    [UserRole.FACULTY]: 2,
    [UserRole.STUDENT]: 1
};

/**
 * Faculty Type Hierarchy
 * Higher number = more permissions
 */
export const FACULTY_TYPE_HIERARCHY: Record<FacultyType, number> = {
    [FacultyType.CREATOR]: 4,
    [FacultyType.PUBLISHER]: 3,
    [FacultyType.GENERAL]: 2,
    [FacultyType.GUEST]: 1
};

/**
 * Check if user has permission based on role hierarchy
 * 
 * @param userRole - User's role
 * @param requiredRole - Required role for the operation
 * @returns True if user has sufficient permissions
 */
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if faculty has permission based on faculty type hierarchy
 * 
 * @param facultyType - Faculty's type
 * @param requiredType - Required faculty type for the operation
 * @returns True if faculty has sufficient permissions
 */
export function hasFacultyPermission(
    facultyType: FacultyType,
    requiredType: FacultyType
): boolean {
    return FACULTY_TYPE_HIERARCHY[facultyType] >= FACULTY_TYPE_HIERARCHY[requiredType];
}

/**
 * Role Permissions
 * Defines what each role can do
 */
export const ROLE_PERMISSIONS = {
    [UserRole.SUPER_ADMIN]: [
        'manage_colleges',
        'manage_college_admins',
        'view_all_data',
        'manage_all_departments',
        'manage_all_faculty',
        'manage_all_students',
        'manage_all_timetables',
        'manage_system_settings'
    ],
    [UserRole.COLLEGE_ADMIN]: [
        'manage_departments',
        'manage_faculty',
        'manage_students',
        'manage_courses',
        'manage_batches',
        'manage_subjects',
        'view_college_data',
        'manage_college_settings'
    ],
    [UserRole.ADMIN]: [
        'manage_department_faculty',
        'manage_department_students',
        'manage_department_courses',
        'view_department_data',
        'create_timetables',
        'publish_timetables'
    ],
    [UserRole.FACULTY]: [
        'view_timetables',
        'view_students',
        'view_subjects',
        'manage_qualifications',
        'view_events'
    ],
    [UserRole.STUDENT]: [
        'view_own_timetable',
        'view_own_subjects',
        'select_subjects',
        'view_events',
        'register_for_events'
    ]
} as const;

/**
 * Faculty Type Permissions
 * Defines what each faculty type can do
 */
export const FACULTY_TYPE_PERMISSIONS = {
    [FacultyType.CREATOR]: [
        'create_timetables',
        'edit_timetables',
        'delete_timetables',
        'create_nep_buckets',
        'manage_subjects',
        'publish_timetables'
    ],
    [FacultyType.PUBLISHER]: [
        'view_timetables',
        'publish_timetables',
        'approve_timetables',
        'reject_timetables'
    ],
    [FacultyType.GENERAL]: [
        'view_timetables',
        'view_subjects',
        'manage_own_qualifications'
    ],
    [FacultyType.GUEST]: [
        'view_timetables',
        'view_subjects'
    ]
} as const;

/**
 * Check if role has specific permission
 * 
 * @param role - User's role
 * @param permission - Permission to check
 * @returns True if role has the permission
 */
export function hasRolePermission(role: UserRole, permission: string): boolean {
    return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

/**
 * Check if faculty type has specific permission
 * 
 * @param facultyType - Faculty's type
 * @param permission - Permission to check
 * @returns True if faculty type has the permission
 */
export function hasFacultyTypePermission(
    facultyType: FacultyType,
    permission: string
): boolean {
    return (FACULTY_TYPE_PERMISSIONS[facultyType] as readonly string[]).includes(permission);
}

/**
 * Role Display Names
 * Human-readable names for roles
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Administrator',
    [UserRole.COLLEGE_ADMIN]: 'College Administrator',
    [UserRole.ADMIN]: 'Department Administrator',
    [UserRole.FACULTY]: 'Faculty Member',
    [UserRole.STUDENT]: 'Student'
};

/**
 * Faculty Type Display Names
 * Human-readable names for faculty types
 */
export const FACULTY_TYPE_DISPLAY_NAMES: Record<FacultyType, string> = {
    [FacultyType.CREATOR]: 'Creator Faculty',
    [FacultyType.PUBLISHER]: 'Publisher Faculty',
    [FacultyType.GENERAL]: 'General Faculty',
    [FacultyType.GUEST]: 'Guest Faculty'
};

/**
 * Get display name for role
 */
export function getRoleDisplayName(role: UserRole): string {
    return ROLE_DISPLAY_NAMES[role];
}

/**
 * Get display name for faculty type
 */
export function getFacultyTypeDisplayName(facultyType: FacultyType): string {
    return FACULTY_TYPE_DISPLAY_NAMES[facultyType];
}
