import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/logging/Logger';

export async function requestLoggingMiddleware(request: NextRequest) {
    const start = Date.now();
    const method = request.method;
    const url = request.nextUrl.pathname;

    // Log start of request (debug level)
    logger.debug(`Incoming ${method} ${url}`, {
        headers: Object.fromEntries(request.headers),
        query: Object.fromEntries(request.nextUrl.searchParams)
    });

    // Create a response by calling the next middleware or allowing the request to proceed
    // effectively, we can't easily "wrap" the standard execution flow in Next.js middleware 
    // to catch the response *after* generation unless we are generating it right here.
    // 
    // In Next.js Middleware, we primarily inspect the request and potentially modify the response *headers* 
    // but the actual page rendering happens *after* middleware finishes.
    // 
    // However, we can log that we *processed* the middleware.
    // For true "Response" logging (status code, etc), one usually needs to use 
    // interceptors or wrap the handlers.
    //
    // But for middleware chaining, we can at least log the request processing duration *within the middleware chain*.

    // Let's assume we proceed
    const response = NextResponse.next();

    // Attach a listener to the response? No, Response objects in middleware are just descriptions.
    // 
    // Best effort: Log that we passed it through. To log the ACTUAL status code of the final response, 
    // we technically can't do it here easily for pages/routes. 
    // But we CAN log the request details.

    const duration = Date.now() - start;

    logger.logApiRequest(method, url, 0, duration, {
        ip: request.ip || request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
        stage: 'middleware_pass'
    });

    return response;
}
