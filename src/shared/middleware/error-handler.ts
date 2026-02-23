import { NextResponse } from 'next/server';

/**
 * Base Application Error
 * All custom errors should extend this class
 */
export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number = 500,
        public code?: string
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error
 * Thrown when request validation fails
 */
export class ValidationError extends AppError {
    constructor(
        message: string,
        public errors?: Record<string, string[]>
    ) {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}

/**
 * Not Found Error
 * Thrown when a resource is not found
 */
export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}

/**
 * Unauthorized Error
 * Thrown when authentication fails
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}

/**
 * Forbidden Error
 * Thrown when user doesn't have permission
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}

/**
 * Conflict Error
 * Thrown when there's a conflict (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}

/**
 * Bad Request Error
 * Thrown when request is malformed
 */
export class BadRequestError extends AppError {
    constructor(message: string) {
        super(message, 400, 'BAD_REQUEST');
        this.name = 'BadRequestError';
    }
}

/**
 * Global Error Handler
 * Converts errors to appropriate HTTP responses
 * 
 * @param error - The error to handle
 * @returns NextResponse with appropriate status code and error message
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   try {
 *     // ... your code
 *   } catch (error) {
 *     return handleError(error);
 *   }
 * }
 * ```
 */
export function handleError(error: unknown): NextResponse {
    console.error('[ERROR]', error);

    // Handle custom application errors
    if (error instanceof AppError) {
        const response: any = {
            success: false,
            error: error.message,
            code: error.code
        };

        // Add validation errors if present
        if (error instanceof ValidationError && error.errors) {
            response.errors = error.errors;
        }

        return NextResponse.json(response, { status: error.statusCode });
    }

    // Handle Supabase/PostgreSQL errors
    if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;

        // Common PostgreSQL error codes
        switch (dbError.code) {
            case '23505': // Unique violation
                return NextResponse.json(
                    { success: false, error: 'Resource already exists', code: 'DUPLICATE_ENTRY' },
                    { status: 409 }
                );

            case '23503': // Foreign key violation
                return NextResponse.json(
                    { success: false, error: 'Referenced resource not found', code: 'FOREIGN_KEY_VIOLATION' },
                    { status: 400 }
                );

            case '23502': // Not null violation
                return NextResponse.json(
                    { success: false, error: 'Required field missing', code: 'NOT_NULL_VIOLATION' },
                    { status: 400 }
                );

            case 'PGRST116': // Not found
                return NextResponse.json(
                    { success: false, error: 'Resource not found', code: 'NOT_FOUND' },
                    { status: 404 }
                );

            default:
                return NextResponse.json(
                    { success: false, error: 'Database error', code: 'DATABASE_ERROR', details: dbError.message },
                    { status: 500 }
                );
        }
    }

    // Handle generic JavaScript errors
    if (error instanceof Error) {
        return NextResponse.json(
            {
                success: false,
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }

    // Handle unknown errors
    return NextResponse.json(
        { success: false, error: 'An unexpected error occurred', code: 'UNKNOWN_ERROR' },
        { status: 500 }
    );
}

/**
 * Async error wrapper
 * Wraps async functions to automatically handle errors
 * 
 * @param fn - Async function to wrap
 * @returns Wrapped function that handles errors
 */
export function asyncHandler<T extends (...args: any[]) => Promise<NextResponse>>(
    fn: T
): T {
    return (async (...args: any[]) => {
        try {
            return await fn(...args);
        } catch (error) {
            return handleError(error);
        }
    }) as T;
}
