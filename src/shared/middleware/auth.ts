import { NextRequest, NextResponse } from 'next/server';
import { serviceDb } from '../database';

/**
 * Authenticated User Interface
 * Represents a user that has been authenticated
 */
export interface AuthUser {
    id: string;
    email: string;
    role: 'super_admin' | 'college_admin' | 'admin' | 'faculty' | 'student';
    college_id: string | null;
    department_id: string | null;
    faculty_type: 'creator' | 'publisher' | 'general' | 'guest' | null;
    first_name?: string;
    last_name?: string;
}

/**
 * Authenticate a request by validating the Bearer token
 * 
 * @param request - Next.js request object
 * @returns Authenticated user or null if authentication fails
 */
export async function authenticate(request: NextRequest): Promise<AuthUser | null> {
    try {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // console.log('[Auth Debug] No Bearer token found in header');
            return null;
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            console.log('[Auth Debug] Token is empty');
            return null;
        }

        let decoded;
        try {
            decoded = Buffer.from(token, 'base64').toString();
        } catch (e) {
            console.error('[Auth Debug] Token base64 decode failed');
            return null;
        }

        let user: AuthUser;
        try {
            user = JSON.parse(decoded);
        } catch (e) {
            console.error('[Auth Debug] Token JSON parse failed', decoded);
            return null;
        }

        if (!user.id) {
            console.log('[Auth Debug] No user ID in token');
            return null;
        }

        // Verify user exists in database using serviceDb (admin access)
        const { data, error } = await serviceDb
            .from('users')
            .select('id, email, role, college_id, department_id, faculty_type, first_name, last_name')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            console.error('[Auth Debug] DB Lookup failed for user:', user.id, 'Error:', error?.message);
            return null;
        }

        console.log('[Auth Debug] Auth successful for:', user.id);

        // Return authenticated user
        return {
            id: data.id,
            email: data.email,
            role: data.role,
            college_id: data.college_id,
            department_id: data.department_id,
            faculty_type: data.faculty_type,
            first_name: data.first_name,
            last_name: data.last_name
        };
    } catch (error) {
        console.error('[AUTH] Authentication error (exception):', error);
        return null;
    }
}

/**
 * Middleware to require authentication
 * Returns a function that can be used in API routes
 * 
 * @param allowedRoles - Optional array of roles that are allowed to access the route
 * @returns Function that authenticates and authorizes the request
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const user = await requireAuth(['admin', 'super_admin'])(request);
 *   if (user instanceof Response) return user; // Error response
 *   
 *   // User is authenticated and authorized
 *   // ... handle request
 * }
 * ```
 */
export function requireAuth(allowedRoles?: string[]) {
    return async (request: NextRequest): Promise<AuthUser | NextResponse> => {
        const user = await authenticate(request);

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Authentication required' },
                { status: 401 }
            );
        }

        if (allowedRoles && !allowedRoles.includes(user.role)) {
            return NextResponse.json(
                {
                    error: 'Forbidden',
                    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
                },
                { status: 403 }
            );
        }

        return user;
    };
}

/**
 * Check if user has permission to access a college
 */
export function canAccessCollege(user: AuthUser, collegeId: string): boolean {
    // Super admin can access all colleges
    if (user.role === 'super_admin') return true;

    // Other users can only access their assigned college
    return user.college_id === collegeId;
}

/**
 * Check if user has permission to access a department
 */
export function canAccessDepartment(user: AuthUser, departmentId: string): boolean {
    // Super admin and college admin can access all departments in their college
    if (user.role === 'super_admin' || user.role === 'college_admin') return true;

    // Other users can only access their assigned department
    return user.department_id === departmentId;
}

/**
 * Legacy alias for migration compatibility
 */
export const getAuthenticatedUser = authenticate;
