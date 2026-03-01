import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/shared/database/middleware';
import { rateLimitMiddleware } from '@/shared/rate-limit/middleware';
import { requestIdMiddleware, HEADER_REQUEST_ID } from '@/middleware/request-id';
import { requestLoggingMiddleware } from '@/middleware/logging';
import { securityHeadersMiddleware } from '@/middleware/security-headers';
import { corsMiddleware } from '@/middleware/cors';
import { authenticateAndCache, HEADER_AUTH_USER } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    // 1. Request ID (Always run, useful for tracing)
    const requestIdResponse = requestIdMiddleware(request);
    const requestId = requestIdResponse.headers.get(HEADER_REQUEST_ID);

    // Clone requestHeaders to pass the ID down to other middleware/handlers
    const requestHeaders = new Headers(request.headers);
    if (requestId) requestHeaders.set(HEADER_REQUEST_ID, requestId);

    // 2. Logging (Always run, useful for debugging)
    // Note: This uses the request with the new ID
    const loggingResponse = await requestLoggingMiddleware(request);

    // 3. CORS (Always run)
    const corsResponse = corsMiddleware(request);

    // 4. Rate Limiting (Production Only or explicit enable)
    let rateLimitResponse = NextResponse.next();
    if (process.env.NODE_ENV !== 'development') {
        rateLimitResponse = await rateLimitMiddleware(request);

        if (rateLimitResponse.status === 429) {
            return rateLimitResponse;
        }
    }

    // 5. Supabase Auth Middleware & Session (The main handler)
    // This creates the actual "next" response that we will build upon
    const supabaseResponse = await updateSession(request);

    // 5. Authenticate user and inject into REQUEST headers
    // ---------------------------------------------------------------
    // CRITICAL: In Next.js middleware, to pass data forward to API route
    // handlers, you MUST set headers on the REQUEST (not the response).
    // Response headers go back to the browser, not to the route handler.
    // We do this via NextResponse.next({ request: { headers } }).
    // ---------------------------------------------------------------
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const authHeader = request.headers.get('authorization');

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];

            if (token) {
                const user = await authenticateAndCache(token);

                if (user) {
                    requestHeaders.set(HEADER_AUTH_USER, JSON.stringify(user));
                }
            }
        }
    }

    // 6. Create the response with modified REQUEST headers
    // This forwards the injected auth user to downstream API route handlers
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Copy cookies from supabase response (if any were set by updateSession)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value);
    });

    // 7. Merge Response Headers from all middleware steps

    // Merge Request ID headers
    requestIdResponse.headers.forEach((value: string, key: string) => {
        response.headers.set(key, value);
    });

    // Merge CORS headers
    corsResponse.headers.forEach((value: string, key: string) => {
        response.headers.set(key, value);
    });

    // Merge Rate Limit headers
    rateLimitResponse.headers.forEach((value: string, key: string) => {
        response.headers.set(key, value);
    });

    // 8. Apply Security Headers (Helmet-like)
    // We apply this to the final response
    const securityResponse = securityHeadersMiddleware(request);
    securityResponse.headers.forEach((value: string, key: string) => {
        response.headers.set(key, value);
    });

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
