import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AuthService } from '../../domain/services/AuthService';
import { RegisterDto, RegisterResult } from '../dto/RegisterDto';
import { ConflictError, ValidationError } from '@/shared/middleware/error-handler';
import { generateUUID } from '@/shared/utils/crypto';

/**
 * Register Use Case
 * 
 * Handles user registration
 */
export class RegisterUseCase {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly authService: AuthService
    ) { }

    /**
     * Execute registration
     */
    async execute(dto: RegisterDto): Promise<RegisterResult> {
        // Generate placeholder email as per legacy system
        const email = `${dto.collegeUid}@college.internal`;

        // Check if user already exists
        const existingUser = await this.userRepository.findByCollegeUid(dto.collegeUid);
        if (existingUser) {
            throw new ConflictError('College UID already registered');
        }

        // Hash password
        const passwordHash = await this.authService.hashPassword(dto.password);

        // Create user
        const user = await this.userRepository.create({
            email,
            collegeUid: dto.collegeUid,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: dto.role as any,
            collegeId: null, // TODO: Needs department lookup
            departmentId: dto.department_id,
            facultyType: dto.faculty_type as any || null,
            studentId: null,
            courseId: null,
            currentSemester: null,
            admissionYear: null,
            isActive: true
        });

        // Generate token
        const token = this.authService.generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            college_id: user.collegeId,
            department_id: user.departmentId,
            faculty_type: user.facultyType
        });

        // Return result
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                college_uid: user.collegeUid,
                role: user.role,
                college_id: user.collegeId,
                department_id: user.departmentId,
                faculty_type: user.facultyType
            }
        };
    }
}
