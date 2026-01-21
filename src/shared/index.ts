/**
 * Shared Module
 * 
 * Centralized shared infrastructure for the application
 * Provides database access, middleware, utilities, types, constants, and configuration
 */

// Database
export * from './database';

// Middleware
export * from './middleware/auth';
export * from './middleware/error-handler';
export * from './middleware/validation';

// Utilities
export {
    ApiResponse,
    getPaginationParams,
    createPaginatedResult,
    getOffset,
    getRange,
    DEFAULT_PAGINATION,
    toISOString,
    formatDate,
    formatDateTime,
    formatTime,
    parseISOString,
    isToday,
    isPast,
    isFuture,
    addDays,
    addMonths,
    startOfDay,
    endOfDay,
    daysBetween,
    academicYear,
    hashPassword,
    verifyPassword,
    generateToken,
    generateNumericCode,
    generateUUID,
    encodeBase64,
    decodeBase64,
    createHash,
    createHMAC,
    verifyHMAC,
    encrypt,
    decrypt
} from './utils';
export type { SuccessResponse, ErrorResponse, PaginationParams, PaginatedResult } from './utils';

// Types
export * from './types';

// Constants
export * from './constants';

// Configuration
export * from './config';
