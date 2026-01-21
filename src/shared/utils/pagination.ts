/**
 * Pagination Utilities
 * 
 * Helpers for implementing pagination in API endpoints
 */

/**
 * Pagination parameters from request
 */
export interface PaginationParams {
    page: number;
    limit: number;
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
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
 * Get pagination parameters from URL search params
 * 
 * @param searchParams - URLSearchParams from request
 * @returns Validated pagination parameters
 * 
 * @example
 * ```typescript
 * const { searchParams } = new URL(request.url);
 * const { page, limit } = getPaginationParams(searchParams);
 * ```
 */
export function getPaginationParams(
    searchParams: URLSearchParams
): PaginationParams {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('limit') || '10', 10))
    );

    return { page, limit };
}

/**
 * Create paginated result
 * 
 * @param data - Array of data items
 * @param total - Total number of items
 * @param params - Pagination parameters
 * @returns Paginated result with metadata
 * 
 * @example
 * ```typescript
 * const users = await getUsers(offset, limit);
 * const total = await getUserCount();
 * return createPaginatedResult(users, total, { page, limit });
 * ```
 */
export function createPaginatedResult<T>(
    data: T[],
    total: number,
    params: PaginationParams
): PaginatedResult<T> {
    const totalPages = Math.ceil(total / params.limit);

    return {
        data,
        pagination: {
            page: params.page,
            limit: params.limit,
            total,
            totalPages,
            hasNext: params.page < totalPages,
            hasPrev: params.page > 1
        }
    };
}

/**
 * Calculate offset for database queries
 * 
 * @param params - Pagination parameters
 * @returns Offset value for database query
 * 
 * @example
 * ```typescript
 * const offset = getOffset({ page: 2, limit: 10 }); // Returns 10
 * const { data } = await db.from('users').select('*').range(offset, offset + limit - 1);
 * ```
 */
export function getOffset(params: PaginationParams): number {
    return (params.page - 1) * params.limit;
}

/**
 * Get range for Supabase queries
 * 
 * @param params - Pagination parameters
 * @returns Object with 'from' and 'to' for Supabase range
 * 
 * @example
 * ```typescript
 * const { from, to } = getRange({ page: 1, limit: 10 });
 * const { data } = await db.from('users').select('*').range(from, to);
 * ```
 */
export function getRange(params: PaginationParams): { from: number; to: number } {
    const from = getOffset(params);
    const to = from + params.limit - 1;
    return { from, to };
}

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION = {
    page: 1,
    limit: 10,
    maxLimit: 100
} as const;
