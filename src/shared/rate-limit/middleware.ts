import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitService } from '@/shared/rate-limit/RateLimitService';

// Rate Limit Configuration Rules
const RATELIMIT_RULES = [
    {
        pattern: /^\/api\/auth\/login/,
        limit: 5,
        window: 60 // 5 requests per minute
    },
    {
        pattern: /^\/api\/auth\/register/,
        limit: 5,
        window: 60 // 5 requests per minute
    },
    {
        pattern: /^\/api\/ai-timetable\/generate/,
        limit: 5,
        window: 3600 // 5 generations per hour
    },
    {
        pattern: /^\/api\//, // Default API limit
        limit: 300,
        window: 60 // 300 requests per minute
    }
];

export async function rateLimitMiddleware(request: NextRequest) {
    // Skip rate limiting in development mode
    if (process.env.NODE_ENV === 'development') {
        return NextResponse.next();
    }

    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    const path = request.nextUrl.pathname;

    // Find matching rule
    const rule = RATELIMIT_RULES.find(r => r.pattern.test(path));

    if (rule) {
        const key = `ratelimit:${ip}:${path}`;
        const result = await rateLimitService.check(key, {
            points: rule.limit,
            duration: rule.window
        });

        if (!result.allowed) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Too Many Requests',
                    message: `Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RateLimit-Limit': rule.limit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'Retry-After': Math.ceil(result.msBeforeNext / 1000).toString()
                    }
                }
            );
        }

        // Add RateLimit headers to successful response (handled by next middleware in chain or modifying response)
        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', rule.limit.toString());
        response.headers.set('X-RateLimit-Remaining', result.remainingPoints.toString());
        return response;
    }

    return NextResponse.next();
}
