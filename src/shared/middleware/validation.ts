import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './error-handler';

/**
 * Validate Request Data
 * 
 * Validates request data against a Zod schema
 * Throws ValidationError if validation fails
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * 
 * @example
 * ```typescript
 * const loginSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(6)
 * });
 * 
 * const body = await request.json();
 * const validatedData = await validateRequest(loginSchema, body);
 * ```
 */
export async function validateRequest<T>(
    schema: ZodSchema<T>,
    data: unknown
): Promise<T> {
    try {
        return await schema.parseAsync(data);
    } catch (error) {
        if (error instanceof ZodError) {
            // Convert Zod errors to our error format
            const errors: Record<string, string[]> = {};

            error.issues.forEach((err) => {
                const path = err.path.join('.');
                if (!errors[path]) {
                    errors[path] = [];
                }
                errors[path].push(err.message);
            });

            throw new ValidationError('Validation failed', errors);
        }
        throw error;
    }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
    /**
     * UUID validation
     */
    uuid: z.string().uuid('Invalid ID format'),

    /**
     * Email validation
     */
    email: z.string().email('Invalid email address'),

    /**
     * Password validation (minimum 6 characters)
     */
    password: z.string().min(6, 'Password must be at least 6 characters'),

    /**
     * Non-empty string
     */
    nonEmptyString: z.string().min(1, 'This field is required'),

    /**
     * Positive integer
     */
    positiveInt: z.number().int().positive('Must be a positive integer'),

    /**
     * Pagination parameters
     */
    pagination: z.object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().max(100).default(10)
    }),

    /**
     * Date string (ISO 8601)
     */
    dateString: z.string().datetime('Invalid date format'),

    /**
     * User role enum
     */
    userRole: z.enum(['super_admin', 'college_admin', 'admin', 'faculty', 'student']),

    /**
     * Faculty type enum
     */
    facultyType: z.enum(['creator', 'publisher', 'general', 'guest'])
};

/**
 * Validate query parameters
 * 
 * @param searchParams - URLSearchParams from request
 * @param schema - Zod schema for query parameters
 * @returns Validated query parameters
 */
export async function validateQueryParams<T>(
    searchParams: URLSearchParams,
    schema: ZodSchema<T>
): Promise<T> {
    // Convert URLSearchParams to object
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
        // Try to parse numbers
        if (!isNaN(Number(value))) {
            params[key] = Number(value);
        } else if (value === 'true' || value === 'false') {
            // Parse booleans
            params[key] = value === 'true';
        } else {
            params[key] = value;
        }
    });

    return validateRequest(schema, params);
}

/**
 * Validate path parameters
 * 
 * @param params - Path parameters object
 * @param schema - Zod schema for path parameters
 * @returns Validated path parameters
 */
export async function validatePathParams<T>(
    params: Record<string, string>,
    schema: ZodSchema<T>
): Promise<T> {
    return validateRequest(schema, params);
}
