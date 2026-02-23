import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/shared/database/middleware';
import { rateLimitMiddleware } from '@/shared/rate-limit/middleware';
import { requestIdMiddleware, HEADER_REQUEST_ID } from '@/middleware/request-id';
import { requestLoggingMiddleware } from '@/middleware/logging';
import { securityHeadersMiddleware } from '@/middleware/security-headers';
import { corsMiddleware } from '@/middleware/cors';

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
    const response = await updateSession(request);

    // 6. Merge Headers from all middleware steps

    // Merge Request ID headers
    requestIdResponse.headers.forEach((value, key) => {
        response.headers.set(key, value);
    });

    // Merge CORS headers
    corsResponse.headers.forEach((value, key) => {
        response.headers.set(key, value);
    });

    // Merge Rate Limit headers
    rateLimitResponse.headers.forEach((value, key) => {
        response.headers.set(key, value);
    });

    // 7. Apply Security Headers (Helmet-like)
    // We apply this to the final response
    const securityResponse = securityHeadersMiddleware(request);
    securityResponse.headers.forEach((value, key) => {
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
