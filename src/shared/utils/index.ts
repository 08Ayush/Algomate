/**
 * Shared Utilities
 * 
 * Common utility functions used across the application
 */

export { ApiResponse } from './response';
export type { SuccessResponse, ErrorResponse } from './response';

export {
    getPaginationParams,
    createPaginatedResult,
    getOffset,
    getRange,
    DEFAULT_PAGINATION
} from './pagination';
export type { PaginationParams, PaginatedResult } from './pagination';

export {
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
    academicYear
} from './date';

export {
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
} from './crypto';
