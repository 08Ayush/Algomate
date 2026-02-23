import { UserRole, FacultyType } from '@/shared/types';

/**
 * User Entity
 * 
 * Represents a user in the domain model
 * Contains business logic related to users
 */
export class User {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly collegeUid: string,
        public readonly passwordHash: string,
        public readonly firstName: string,
        public readonly lastName: string,
        public readonly role: UserRole,
        public readonly collegeId: string | null,
        public readonly departmentId: string | null,
        public readonly facultyType: FacultyType | null,
        public readonly studentId: string | null,
        public readonly courseId: string | null,
        public readonly currentSemester: number | null,
        public readonly admissionYear: number | null,
        public readonly isActive: boolean,
        public readonly createdAt: Date,
        public readonly updatedAt: Date
    ) { }

    /**
     * Check if user is super admin
     */
    isSuperAdmin(): boolean {
        return this.role === UserRole.SUPER_ADMIN;
    }

    /**
     * Check if user is college admin
     */
    isCollegeAdmin(): boolean {
        return this.role === UserRole.COLLEGE_ADMIN;
    }

    /**
     * Check if user is any type of admin
     */
    isAdmin(): boolean {
        return [UserRole.SUPER_ADMIN, UserRole.COLLEGE_ADMIN, UserRole.ADMIN].includes(this.role);
    }

    /**
     * Check if user is faculty
     */
    isFaculty(): boolean {
        return this.role === UserRole.FACULTY;
    }

    /**
     * Check if user is student
     */
    isStudent(): boolean {
        return this.role === UserRole.STUDENT;
    }

    /**
     * Check if user can access a specific college
     */
    canAccessCollege(collegeId: string): boolean {
        if (this.isSuperAdmin()) return true;
        return this.collegeId === collegeId;
    }

    /**
     * Check if user can access a specific department
     */
    canAccessDepartment(departmentId: string): boolean {
        if (this.isSuperAdmin() || this.isCollegeAdmin()) return true;
        return this.departmentId === departmentId;
    }

    /**
     * Check if faculty is creator type
     */
    isCreatorFaculty(): boolean {
        return this.isFaculty() && this.facultyType === FacultyType.CREATOR;
    }

    /**
     * Check if faculty is publisher type
     */
    isPublisherFaculty(): boolean {
        return this.isFaculty() && this.facultyType === FacultyType.PUBLISHER;
    }

    /**
     * Get user's display role
     */
    getDisplayRole(): string {
        const roleNames: Record<UserRole, string> = {
            [UserRole.SUPER_ADMIN]: 'Super Administrator',
            [UserRole.COLLEGE_ADMIN]: 'College Administrator',
            [UserRole.ADMIN]: 'Department Administrator',
            [UserRole.FACULTY]: 'Faculty Member',
            [UserRole.STUDENT]: 'Student'
        };
        return roleNames[this.role];
    }

    /**
     * Convert to plain object (for API responses)
     */
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            college_uid: this.collegeUid,
            first_name: this.firstName,
            last_name: this.lastName,
            role: this.role,
            college_id: this.collegeId,

            department_id: this.departmentId,
            faculty_type: this.facultyType,
            student_id: this.studentId,
            course_id: this.courseId,
            current_semester: this.currentSemester,
            admission_year: this.admissionYear,
            is_active: this.isActive,
            created_at: this.createdAt.toISOString(),
            updated_at: this.updatedAt.toISOString()
        };
    }

    /**
     * Convert to safe object (without sensitive data)
     */
    toSafeJSON() {
        const json = this.toJSON();
        // Remove password hash (it's not in toJSON anyway, but being explicit)
        return json;
    }
}
