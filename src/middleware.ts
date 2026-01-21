import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/shared/database/middleware';
import { rateLimitMiddleware } from '@/shared/rate-limit/middleware';

export async function middleware(request: NextRequest) {
    // COMPLETELY SKIP MIDDLEWARE IN DEVELOPMENT
    // This prevents any imports or code from executing
    if (process.env.NODE_ENV === 'development') {
        return NextResponse.next();
    }

    // Production code below (not executed in dev)
    // 1. Run Rate Limiting First (Protect resources cheaper)
    const rateLimitResponse = await rateLimitMiddleware(request);

    // If rate limit failed, return the 429 response immediately
    if (rateLimitResponse.status === 429) {
        return rateLimitResponse;
    }

    // 2. Run Supabase Auth Middleware
    // Note: updateSession returns a Response object that we should return,
    // but we also want to preserve headers from rateLimitResponse if any (like limit info)
    const response = await updateSession(request);

    // Merge headers from rate limit (e.g. X-RateLimit-Remaining) into final response
    rateLimitResponse.headers.forEach((value, key) => {
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
