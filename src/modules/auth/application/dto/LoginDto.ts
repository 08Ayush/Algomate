import { z } from 'zod';

/**
 * Login DTO Schema
 */
export const LoginDtoSchema = z.object({
    collegeUid: z.string().min(1, 'College UID is required'),
    password: z.string().min(1, 'Password is required')
});

/**
 * Login DTO Type
 */
export type LoginDto = z.infer<typeof LoginDtoSchema>;

/**
 * Login Result
 */
export interface LoginResult {
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
