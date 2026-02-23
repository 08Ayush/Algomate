import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '@/shared/middleware/error-handler';

/**
 * Standardized error handler for API routes
 * 
 * @param error - The error object caught in the try-catch block
 * @returns NextResponse with appropriate status code and error message
 */
export function handleError(error: any): NextResponse {
    console.error('API Error:', error);

    // Handle AppError (custom errors)
    if (error instanceof AppError) {
        return ApiResponse.error(
            error.message,
            error.statusCode,
            error.code,
            error instanceof ValidationError ? (error as any).errors : undefined
        );
    }

    // Handle ZodError (validation errors)
    if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};

        error.errors.forEach((err) => {
            const path = err.path.join('.');
            if (!errors[path]) {
                errors[path] = [];
            }
            errors[path].push(err.message);
        });

        return ApiResponse.badRequest('Validation failed', errors);
    }

    // Handle Supabase errors
    if (error.code) {
        // Unique violation
        if (error.code === '23505') {
            return ApiResponse.conflict('Resource already exists');
        }

        // Foreign key violation
        if (error.code === '23503') {
            return ApiResponse.badRequest('Referenced resource not found');
        }
    }

    // Default error
    return ApiResponse.internalError(
        process.env.NODE_ENV === 'development'
            ? error.message || 'An unexpected error occurred'
            : 'An unexpected error occurred'
    );
}

// ... existing imports and ApiResponse class ...
export interface SuccessResponse<T> {
    success: true;
    message?: string;
    data: T;
}

export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    errors?: Record<string, string[]>;
}

export class ApiResponse {
    static success<T>(
        data: T,
        message?: string,
        statusCode: number = 200
    ): NextResponse {
        const response: SuccessResponse<T> = {
            success: true,
            data
        };

        if (message) {
            response.message = message;
        }

        return NextResponse.json(response, { status: statusCode });
    }

    static error(
        message: string,
        statusCode: number = 500,
        code?: string,
        errors?: Record<string, string[]>
    ): NextResponse {
        const response: ErrorResponse = {
            success: false,
            error: message
        };

        if (code) {
            response.code = code;
        }

        if (errors) {
            response.errors = errors;
        }

        return NextResponse.json(response, { status: statusCode });
    }

    static created<T>(
        data: T,
        message: string = 'Resource created successfully'
    ): NextResponse {
        return this.success(data, message, 201);
    }

    static noContent(): NextResponse {
        return new NextResponse(null, { status: 204 });
    }

    static badRequest(
        message: string = 'Bad request',
        errors?: Record<string, string[]>
    ): NextResponse {
        return this.error(message, 400, 'BAD_REQUEST', errors);
    }

    static unauthorized(message: string = 'Unauthorized'): NextResponse {
        return this.error(message, 401, 'UNAUTHORIZED');
    }

    static forbidden(message: string = 'Forbidden'): NextResponse {
        return this.error(message, 403, 'FORBIDDEN');
    }

    static notFound(resource: string = 'Resource'): NextResponse {
        return this.error(`${resource} not found`, 404, 'NOT_FOUND');
    }

    static conflict(message: string = 'Resource already exists'): NextResponse {
        return this.error(message, 409, 'CONFLICT');
    }

    static internalError(
        message: string = 'Internal server error'
    ): NextResponse {
        return this.error(message, 500, 'INTERNAL_ERROR');
    }
}

// Define specific error types for cleaner imports in this file if needed, 
// but mostly we rely on the error-handler module.
// We need to define ValidationError locally if not imported or modify imports above.
class ValidationError extends AppError {
    constructor(message: string, public errors?: Record<string, string[]>) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
