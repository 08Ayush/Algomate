/**
 * API Types
 * 
 * Type definitions for API requests and responses
 */

/**
 * API Success Response
 * Standard format for successful API responses
 */
export interface ApiSuccessResponse<T> {
    success: true;
    message?: string;
    data: T;
}

/**
 * API Error Response
 * Standard format for error API responses
 */
export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    errors?: Record<string, string[]>;
}

/**
 * API Response
 * Union type of success and error responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated API Response
 * Response format for paginated data
 */
export interface PaginatedApiResponse<T> {
    success: true;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * HTTP Method Types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP Status Codes
 */
export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    UNPROCESSABLE_ENTITY = 422,
    INTERNAL_SERVER_ERROR = 500
}

/**
 * Query Parameters
 * Common query parameters for API requests
 */
export interface QueryParams {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
    filter?: Record<string, any>;
}

/**
 * API Error Code
 * Standard error codes used across the API
 */
export enum ApiErrorCode {
    // Authentication errors
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    INVALID_TOKEN = 'INVALID_TOKEN',
    TOKEN_EXPIRED = 'TOKEN_EXPIRED',

    // Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // Resource errors
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    CONFLICT = 'CONFLICT',

    // Database errors
    DATABASE_ERROR = 'DATABASE_ERROR',
    FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
    UNIQUE_VIOLATION = 'UNIQUE_VIOLATION',

    // Server errors
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

    // Business logic errors
    INVALID_OPERATION = 'INVALID_OPERATION',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    RESOURCE_LOCKED = 'RESOURCE_LOCKED'
}

/**
 * Request Context
 * Context information available in API routes
 */
export interface RequestContext {
    user?: {
        id: string;
        email: string;
        role: string;
        college_id: string | null;
        department_id: string | null;
    };
    requestId?: string;
    timestamp?: string;
}
