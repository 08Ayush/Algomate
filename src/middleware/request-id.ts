import { NextRequest, NextResponse } from 'next/server';

export const HEADER_REQUEST_ID = 'X-Request-ID';

export function requestIdMiddleware(request: NextRequest) {
    // Check if request already has an ID (e.g. from load balancer)
    const existingRequestId = request.headers.get(HEADER_REQUEST_ID);
    const requestId = existingRequestId || crypto.randomUUID();

    // Clone request headers to add the ID if missing (for downstream use)
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(HEADER_REQUEST_ID, requestId);

    // We can't modify the *incoming* request object's headers directly for the *current* scope easily,
    // but we can pass modified headers to the next response using NextResponse.next()

    // However, Next.js Middleware pattern typically involves returning a response.
    // If we want to chain, we usually modify the response we return or the request we pass down.

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Add the ID to the response headers so the client sees it too
    response.headers.set(HEADER_REQUEST_ID, requestId);

    return response;
}
