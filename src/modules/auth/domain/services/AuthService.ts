import { hashPassword, verifyPassword } from '@/shared/utils/crypto';

/**
 * Authentication Service
 * 
 * Domain service for authentication-related business logic
 */
export class AuthService {
    /**
     * Hash a password
     */
    async hashPassword(password: string): Promise<string> {
        return hashPassword(password);
    }

    /**
     * Verify a password against a hash
     */
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return verifyPassword(password, hash);
    }

    /**
     * Validate password strength
     */
    validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }

        if (password.length > 100) {
            errors.push('Password must be less than 100 characters');
        }

        // Optional: Add more password strength requirements
        // if (!/[A-Z]/.test(password)) {
        //   errors.push('Password must contain at least one uppercase letter');
        // }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate email format
     */
    validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate authentication token
     * For now, we use Base64 encoding of user data
     * In production, consider using JWT
     */
    generateToken(userData: {
        id: string;
        email: string;
        role: string;
        college_id: string | null;
        department_id: string | null;
        faculty_type: string | null;
    }): string {
        const json = JSON.stringify(userData);
        return Buffer.from(json).toString('base64');
    }

    /**
     * Decode authentication token
     */
    decodeToken(token: string): any {
        try {
            const json = Buffer.from(token, 'base64').toString('utf-8');
            return JSON.parse(json);
        } catch (error) {
            return null;
        }
    }
}
