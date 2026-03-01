/**
 * Centralized Authentication Utilities
 * Provides fast, cached authentication for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthUser } from '@/shared/middleware/auth';
import { sessionCache } from './session-cache';
import { serviceDb } from '@/shared/database';

/**
 * Custom header name for passing authenticated user data
 * from middleware to API routes
 */
export const HEADER_AUTH_USER = 'x-auth-user';

/**
 * Get authenticated user from request headers
 * This is the FASTEST method - user is already authenticated by middleware
 * 
 * Use this in API routes instead of calling authenticate() repeatedly
 * 
 * @param request - Next.js request object
 * @returns Authenticated user or null
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
    try {
        const userHeader = request.headers.get(HEADER_AUTH_USER);
        if (!userHeader) {
            return null;
        }

        const user = JSON.parse(userHeader) as AuthUser;
        return user;
    } catch (error) {
        console.error('[Auth] Failed to parse user from header:', error);
        return null;
    }
}

/**
 * Require authentication for an API route
 * Returns user or sends 401 response
 * 
 * @param request - Next.js request object
 * @returns Authenticated user or Response with error
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const user = requireAuth(request);
 *   if (user instanceof NextResponse) return user; // Auth failed
 *   
 *   // User is authenticated, continue...
 * }
 * ```
 */
export function requireAuth(request: NextRequest): AuthUser | NextResponse {
    const user = getAuthUser(request);
    
    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
        );
    }
    
    return user;
}

/**
 * Require specific roles for an API route
 * 
 * @param request - Next.js request object
 * @param allowedRoles - Array of allowed roles
 * @returns Authenticated user or Response with error
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const user = requireRoles(request, ['admin', 'super_admin']);
 *   if (user instanceof NextResponse) return user; // Not authorized
 *   
 *   // User has required role, continue...
 * }
 * ```
 */
export function requireRoles(
    request: NextRequest,
    allowedRoles: string[]
): AuthUser | NextResponse {
    const user = requireAuth(request);
    
    if (user instanceof NextResponse) {
        return user; // Return auth error
    }
    
    if (!allowedRoles.includes(user.role)) {
        return NextResponse.json(
            {
                error: 'Forbidden',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            },
            { status: 403 }
        );
    }
    
    return user;
}

/**
 * Authenticate and cache user session
 * This is called by middleware, not by individual API routes
 * 
 * @param token - Bearer token from Authorization header
 * @returns Authenticated user or null
 */
export async function authenticateAndCache(token: string): Promise<AuthUser | null> {
    try {
        // Decode token
        let decoded: string;
        try {
            decoded = Buffer.from(token, 'base64').toString();
        } catch (e) {
            console.error('[Auth] Token decode failed');
            return null;
        }

        let tokenData: { id: string };
        try {
            tokenData = JSON.parse(decoded);
        } catch (e) {
            console.error('[Auth] Token parse failed');
            return null;
        }

        if (!tokenData.id) {
            console.error('[Auth] No user ID in token');
            return null;
        }

        // Check cache first - PERFORMANCE BOOST
        const cachedUser = sessionCache.get(tokenData.id);
        if (cachedUser) {
            // console.log('[Auth] Cache HIT for user:', tokenData.id);
            return cachedUser;
        }

        // console.log('[Auth] Cache MISS for user:', tokenData.id, '- fetching from DB');

        // Cache miss - fetch from database
        const { data, error } = await serviceDb
            .from('users')
            .select('id, email, role, college_id, department_id, faculty_type, first_name, last_name')
            .eq('id', tokenData.id)
            .single();

        if (error || !data) {
            console.error('[Auth] DB lookup failed:', error?.message);
            return null;
        }

        const user: AuthUser = {
            id: data.id,
            email: data.email,
            role: data.role,
            college_id: data.college_id,
            department_id: data.department_id,
            faculty_type: data.faculty_type,
            first_name: data.first_name,
            last_name: data.last_name
        };

        // Store in cache for future requests - PERFORMANCE BOOST
        sessionCache.set(user.id, user);

        return user;
    } catch (error) {
        console.error('[Auth] Authentication error:', error);
        return null;
    }
}

/**
 * Check if user has permission to access a college
 */
export function canAccessCollege(user: AuthUser, collegeId: string): boolean {
    if (user.role === 'super_admin') return true;
    return user.college_id === collegeId;
}

/**
 * Check if user has permission to access a department
 */
export function canAccessDepartment(user: AuthUser, departmentId: string): boolean {
    if (user.role === 'super_admin' || user.role === 'college_admin') return true;
    return user.department_id === departmentId;
}

/**
 * Invalidate user session cache
 * Call this after user updates (role change, etc.)
 */
export function invalidateUserCache(userId: string): void {
    sessionCache.delete(userId);
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
    return sessionCache.getStats();
}
