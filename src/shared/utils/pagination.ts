import { NextRequest } from 'next/server';

export interface PaginationParams {
    page?: number;
    limit?: number;
    offset?: number;
    isPaginated: boolean;
}

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Extract pagination parameters from request URL
 * Returns isPaginated: false if 'page' parameter is missing
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
    const { searchParams } = new URL(request.url);

    // Dual-Mode Strategy:
    // If 'page' is not provided, we assume "Fetch All" (Selection Mode)
    // If 'page' IS provided, we enforce pagination (Table Mode)
    if (!searchParams.has('page')) {
        return { isPaginated: false };
    }

    let page = parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10);
    let limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);

    if (isNaN(page) || page < 1) page = DEFAULT_PAGE;
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    const offset = (page - 1) * limit;

    return { page, limit, offset, isPaginated: true };
}

/**
 * Calculate Supabase range [start, end]
 */
export function getPaginationRange(page: number, limit: number): { from: number; to: number } {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    return { from, to };
}

/**
 * Create a standardized paginated response object
 */
export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
}
