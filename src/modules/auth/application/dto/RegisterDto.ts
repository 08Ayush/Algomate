import { z } from 'zod';
import { UserRole, FacultyType } from '@/shared/types';

/**
 * Register DTO Schema
 */
export const RegisterDtoSchema = z.object({
    collegeUid: z.string().min(1, 'College UID is required'),
    password: z.string().min(1, 'Password is required'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    department_id: z.string().uuid('Invalid department ID'),
    role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Invalid role' }) }),
    // Allow partial validation for faculty_type if role depends on it, but Zod makes it tricky.
    // Making it optional here, validation logic in UseCase or refined schema can handle strictness.
    faculty_type: z.nativeEnum(FacultyType).optional()
});

/**
 * Register DTO Type
 */
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

/**
 * Register Result
 */
export interface RegisterResult {
    token: string;
    user: {
        id: string;
        email: string;
        college_uid: string;
        role: string;
        college_id: string | null;
        department_id: string | null;
        faculty_type: string | null;
    };
}
