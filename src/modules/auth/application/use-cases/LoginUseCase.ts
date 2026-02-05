import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AuthService } from '../../domain/services/AuthService';
import { LoginDto, LoginResult } from '../dto/LoginDto';
import { UnauthorizedError } from '@/shared/middleware/error-handler';

/**
 * Login Use Case
 * 
 * Handles user authentication
 */
export class LoginUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly authService: AuthService
    ) { }

    /**
     * Execute login
     */
    async execute(dto: LoginDto): Promise<LoginResult> {
        // Find user by college UID
        const user = await this.userRepository.findByCollegeUid(dto.collegeUid);

        if (!user) {
            throw new UnauthorizedError('Invalid College UID or password');
        }

        // Verify password
        const isValidPassword = await this.authService.verifyPassword(
            dto.password,
            user.passwordHash
        );

        if (!isValidPassword) {
            throw new UnauthorizedError('Invalid College UID or password');
        }

        // Generate token
        const token = this.authService.generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            college_id: user.collegeId,
            department_id: user.departmentId,
            faculty_type: user.facultyType
        });

        // Save token and last login to database (Critical for session validation)
        try {
            await this.userRepository.updateLastLogin(user.id, token);
        } catch (error: any) {
            // Graceful degradation: If the database is missing the 'token' column (PGRST204),
            // or has other issues, we log it but do NOT block the user from logging in.
            console.warn('⚠️ Shared: Failed to persist session to database. User is logged in but session is not tracked.', error.message);
        }

        // Return result with extended user data
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                college_uid: user.collegeUid,
                role: user.role,
                college_id: user.collegeId,
                department_id: user.departmentId,
                faculty_type: user.facultyType,
                // Extended fields for UI
                first_name: user.firstName,
                last_name: user.lastName,
                student_id: user.studentId,
                course_id: user.courseId,
                current_semester: user.currentSemester,
                admission_year: user.admissionYear,
                is_active: user.isActive
            }
        };
    }
}
