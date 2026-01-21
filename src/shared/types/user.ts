/**
 * User Types
 * 
 * Type definitions for user-related data
 */

/**
 * User Role Enum
 * Defines all possible user roles in the system
 */
export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    COLLEGE_ADMIN = 'college_admin',
    ADMIN = 'admin',
    FACULTY = 'faculty',
    STUDENT = 'student'
}

/**
 * Faculty Type Enum
 * Defines different types of faculty members
 */
export enum FacultyType {
    CREATOR = 'creator',
    PUBLISHER = 'publisher',
    GENERAL = 'general',
    GUEST = 'guest'
}

/**
 * User Interface
 * Represents a user in the system
 */
export interface User {
    id: string;
    email: string;
    role: UserRole;
    college_id: string | null;
    department_id: string | null;
    faculty_type: FacultyType | null;
    created_at: string;
    updated_at: string;
}

/**
 * User Create DTO
 * Data required to create a new user
 */
export interface CreateUserDto {
    email: string;
    password: string;
    role: UserRole;
    college_id?: string;
    department_id?: string;
    faculty_type?: FacultyType;
}

/**
 * User Update DTO
 * Data that can be updated for a user
 */
export interface UpdateUserDto {
    email?: string;
    password?: string;
    role?: UserRole;
    college_id?: string;
    department_id?: string;
    faculty_type?: FacultyType;
}

/**
 * Authenticated User
 * User data available after authentication
 */
export interface AuthenticatedUser {
    id: string;
    email: string;
    role: UserRole;
    college_id: string | null;
    department_id: string | null;
    faculty_type: FacultyType | null;
}

/**
 * User Profile
 * Extended user information for profile display
 */
export interface UserProfile extends User {
    name?: string;
    phone?: string;
    avatar_url?: string;
    college_name?: string;
    department_name?: string;
}

/**
 * Type guard to check if user is super admin
 */
export function isSuperAdmin(user: AuthenticatedUser): boolean {
    return user.role === UserRole.SUPER_ADMIN;
}

/**
 * Type guard to check if user is college admin
 */
export function isCollegeAdmin(user: AuthenticatedUser): boolean {
    return user.role === UserRole.COLLEGE_ADMIN;
}

/**
 * Type guard to check if user is admin (any admin role)
 */
export function isAdmin(user: AuthenticatedUser): boolean {
    return [UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.ADMIN].includes(user.role);
}

/**
 * Type guard to check if user is faculty
 */
export function isFaculty(user: AuthenticatedUser): boolean {
    return user.role === UserRole.FACULTY;
}

/**
 * Type guard to check if user is student
 */
export function isStudent(user: AuthenticatedUser): boolean {
    return user.role === UserRole.STUDENT;
}

/**
 * Type guard to check if faculty is creator
 */
export function isCreatorFaculty(user: AuthenticatedUser): boolean {
    return user.role === UserRole.FACULTY && user.faculty_type === FacultyType.CREATOR;
}

/**
 * Type guard to check if faculty is publisher
 */
export function isPublisherFaculty(user: AuthenticatedUser): boolean {
    return user.role === UserRole.FACULTY && user.faculty_type === FacultyType.PUBLISHER;
}
