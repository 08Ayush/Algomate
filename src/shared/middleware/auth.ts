import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/shared/database';

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
}

/**
 * Authenticate a request by validating the Bearer token
 * 
 * @param request - Next.js request object
 * @returns Authenticated user or null if authentication fails
 */
export async function authenticate(request: NextRequest): Promise<AuthUser | null> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        // Extract and decode token
        const token = authHeader.substring(7);
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const user: AuthUser = JSON.parse(decoded);

        // Verify user exists in database
        const { data, error } = await db
            .from('users')
            .select('id, email, role, college_id, department_id, faculty_type')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            console.error('[AUTH] User not found in database:', user.id);
            return null;
        }

        // Return authenticated user
        return {
            id: data.id,
            email: data.email,
            role: data.role,
            college_id: data.college_id,
            department_id: data.department_id,
            faculty_type: data.faculty_type
        };
    } catch (error) {
        console.error('[AUTH] Authentication error:', error);
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
