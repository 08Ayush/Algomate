/**
 * Error Constants
 * 
 * Centralized error codes and messages
 */

import { ApiErrorCode } from '@/shared/types/api';

/**
 * Error Messages
 * Human-readable error messages for each error code
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
    // Authentication errors
    [ApiErrorCode.UNAUTHORIZED]: 'Authentication required. Please log in.',
    [ApiErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
    [ApiErrorCode.INVALID_TOKEN]: 'Invalid authentication token.',
    [ApiErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',

    // Validation errors
    [ApiErrorCode.VALIDATION_ERROR]: 'The provided data is invalid.',
    [ApiErrorCode.INVALID_INPUT]: 'Invalid input provided.',
    [ApiErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing.',

    // Resource errors
    [ApiErrorCode.NOT_FOUND]: 'The requested resource was not found.',
    [ApiErrorCode.ALREADY_EXISTS]: 'This resource already exists.',
    [ApiErrorCode.CONFLICT]: 'There is a conflict with the current state.',

    // Database errors
    [ApiErrorCode.DATABASE_ERROR]: 'A database error occurred.',
    [ApiErrorCode.FOREIGN_KEY_VIOLATION]: 'Referenced resource not found.',
    [ApiErrorCode.UNIQUE_VIOLATION]: 'This value must be unique.',

    // Server errors
    [ApiErrorCode.INTERNAL_ERROR]: 'An internal server error occurred.',
    [ApiErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable.',

    // Business logic errors
    [ApiErrorCode.INVALID_OPERATION]: 'This operation is not allowed.',
    [ApiErrorCode.PERMISSION_DENIED]: 'Permission denied for this operation.',
    [ApiErrorCode.RESOURCE_LOCKED]: 'This resource is locked and cannot be modified.'
};

/**
 * Get error message for error code
 */
export function getErrorMessage(code: ApiErrorCode): string {
    return ERROR_MESSAGES[code];
}

/**
 * Validation Error Messages
 * Common validation error messages
 */
export const VALIDATION_MESSAGES = {
    REQUIRED: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PASSWORD: 'Password must be at least 6 characters',
    PASSWORDS_DONT_MATCH: 'Passwords do not match',
    INVALID_UUID: 'Invalid ID format',
    INVALID_DATE: 'Invalid date format',
    MIN_LENGTH: (min: number) => `Must be at least ${min} characters`,
    MAX_LENGTH: (max: number) => `Must be at most ${max} characters`,
    MIN_VALUE: (min: number) => `Must be at least ${min}`,
    MAX_VALUE: (max: number) => `Must be at most ${max}`,
    INVALID_FORMAT: 'Invalid format',
    INVALID_CHOICE: 'Invalid choice'
} as const;

/**
 * Business Logic Error Messages
 * Domain-specific error messages
 */
export const BUSINESS_ERROR_MESSAGES = {
    // Timetable errors
    TIMETABLE_CONFLICT: 'There is a scheduling conflict',
    TIMETABLE_ALREADY_PUBLISHED: 'This timetable is already published',
    TIMETABLE_NOT_APPROVED: 'This timetable has not been approved',
    CANNOT_MODIFY_PUBLISHED_TIMETABLE: 'Cannot modify a published timetable',

    // Subject selection errors
    MAJOR_ALREADY_LOCKED: 'MAJOR subject is already locked and cannot be changed',
    INVALID_SUBJECT_SELECTION: 'Invalid subject selection',
    SUBJECT_NOT_AVAILABLE: 'This subject is not available for selection',
    BUCKET_FULL: 'This bucket is full',

    // Faculty errors
    FACULTY_NOT_QUALIFIED: 'Faculty is not qualified to teach this subject',
    FACULTY_NOT_AVAILABLE: 'Faculty is not available at this time',

    // Classroom errors
    CLASSROOM_NOT_AVAILABLE: 'Classroom is not available at this time',
    CLASSROOM_CAPACITY_EXCEEDED: 'Classroom capacity exceeded',

    // Event errors
    EVENT_FULL: 'This event is full',
    EVENT_REGISTRATION_CLOSED: 'Registration for this event is closed',
    ALREADY_REGISTERED: 'You are already registered for this event',

    // Permission errors
    CANNOT_ACCESS_OTHER_COLLEGE: 'Cannot access data from other colleges',
    CANNOT_ACCESS_OTHER_DEPARTMENT: 'Cannot access data from other departments',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this operation'
} as const;

/**
 * Success Messages
 * Common success messages
 */
export const SUCCESS_MESSAGES = {
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    SAVED: 'Saved successfully',
    PUBLISHED: 'Published successfully',
    APPROVED: 'Approved successfully',
    REJECTED: 'Rejected successfully',
    REGISTERED: 'Registered successfully',
    UNREGISTERED: 'Unregistered successfully',
    SENT: 'Sent successfully',
    LOGGED_IN: 'Logged in successfully',
    LOGGED_OUT: 'Logged out successfully'
} as const;

/**
 * Get success message
 */
export function getSuccessMessage(action: keyof typeof SUCCESS_MESSAGES): string {
    return SUCCESS_MESSAGES[action];
}
