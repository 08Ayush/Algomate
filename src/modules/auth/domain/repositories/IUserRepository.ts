import { User } from '../entities/User';

/**
 * User Repository Interface
 * 
 * Defines the contract for user data access
 * Infrastructure layer will implement this interface
 */
export interface IUserRepository {
    /**
     * Find user by ID
     */
    findById(id: string): Promise<User | null>;

    /**
     * Find user by email
     */
    findByEmail(email: string): Promise<User | null>;

    /**
     * Find user by college UID
     */
    findByCollegeUid(collegeUid: string): Promise<User | null>;

    /**
     * Find all users
     */
    findAll(): Promise<User[]>;

    /**
     * Find users by role
     */
    findByRole(role: string): Promise<User[]>;

    /**
     * Find users by college
     */
    findByCollege(collegeId: string, roles?: string[]): Promise<User[]>;

    /**
     * Find users by department
     */
    findByDepartment(departmentId: string): Promise<User[]>;

    /**
     * Create a new user
     */
    create(user: Pick<User, 'email' | 'collegeUid' | 'passwordHash' | 'firstName' | 'lastName' | 'role' | 'collegeId' | 'departmentId' | 'facultyType' | 'isActive' | 'studentId' | 'courseId' | 'currentSemester' | 'admissionYear'>): Promise<User>;

    /**
     * Update user
     */
    update(id: string, data: Partial<User>): Promise<User>;

    /**
     * Delete user
     */
    delete(id: string): Promise<boolean>;

    /**
     * Check if email exists
     */
    emailExists(email: string): Promise<boolean>;

    /**
     * Count users by role
     */
    countByRole(role: string): Promise<number>;

    /**
     * Count users by college
     */
    countByCollege(collegeId: string): Promise<number>;

    /**
     * Find latest student (by college UID)
     */
    findLatestStudent(collegeId: string): Promise<User | null>;

    /**
     * Update user's last login timestamp and token
     */
    updateLastLogin(id: string, token: string): Promise<void>;
}
