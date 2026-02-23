import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://academic-compass.vercel.app',
    // Add other production domains here
];

export function corsMiddleware(request: NextRequest) {
    const origin = request.headers.get('origin');

    // Check if origin is allowed (or allow all if * - risky for credentials)
    // If origin is null (same origin requests sometimes), we can skip

    const response = NextResponse.next();
    const headers = response.headers;

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
        headers.set(
            'Access-Control-Allow-Headers',
            'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-Request-ID'
        );
    }

    // Handle Preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: headers
        });
    }

    return response;
}
