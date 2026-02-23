import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitService } from '@/shared/rate-limit/RateLimitService';

// Rate Limit Configuration Rules
interface RateLimitRule {
    pattern: RegExp;
    limit: number;
    window: number;
    description?: string;
}

// Rate Limit Configuration Rules
const RATELIMIT_RULES: RateLimitRule[] = [
    // ========================================
    // 🔴 CRITICAL - Resource Intensive
    // ========================================
    {
        pattern: /^\/api\/scheduler\/generate/,
        limit: 3,
        window: 3600, // 3 requests per hour
        description: 'Timetable generation (CP-SAT + GA)'
    },
    {
        pattern: /^\/api\/ai-timetable\/generate/,
        limit: 5,
        window: 3600, // 5 requests per hour
        description: 'AI timetable generation'
    },
    {
        pattern: /^\/api\/nep-scheduler/,
        limit: 5,
        window: 3600, // 5 requests per hour
        description: 'NEP 2020 scheduler'
    },
    {
        pattern: /^\/api\/hybrid-timetable\/generate/,
        limit: 5,
        window: 3600, // 5 requests per hour
        description: 'Hybrid timetable generation'
    },

    // ========================================
    // 🟡 HIGH - Security Sensitive
    // ========================================
    {
        pattern: /^\/api\/auth\/forgot-password/,
        limit: 3,
        window: 3600, // 3 requests per hour
        description: 'Password reset (prevent spam)'
    },
    {
        pattern: /^\/api\/admin\/login/,
        limit: 5,
        window: 300, // 5 requests per 5 minutes
        description: 'Admin login (stricter than regular)'
    },
    {
        pattern: /^\/api\/auth\/login/,
        limit: 5,
        window: 60, // 5 requests per minute
        description: 'User login'
    },
    {
        pattern: /^\/api\/auth\/register/,
        limit: 5,
        window: 60, // 5 requests per minute
        description: 'User registration'
    },
    {
        pattern: /^\/api\/college\/register/,
        limit: 3,
        window: 3600, // 3 requests per hour
        description: 'College registration'
    },
    {
        pattern: /^\/api\/college\/send-credentials/,
        limit: 5,
        window: 3600, // 5 requests per hour
        description: 'Send credentials email'
    },
    {
        pattern: /^\/api\/email/,
        limit: 10,
        window: 3600, // 10 requests per hour
        description: 'Email sending operations'
    },

    // ========================================
    // 🟢 MEDIUM - Bulk Operations
    // ========================================
    {
        pattern: /^\/api\/admin\/students\/batch-enrollment/,
        limit: 20,
        window: 60, // 20 requests per minute
        description: 'Bulk student enrollment'
    },
    {
        pattern: /^\/api\/admin\/subject-allotment/,
        limit: 20,
        window: 60, // 20 requests per minute
        description: 'Subject allotment operations'
    },
    {
        pattern: /^\/api\/admin\/allotment\/(complete|convert)/,
        limit: 10,
        window: 60, // 10 requests per minute
        description: 'Allotment finalization'
    },

    // ========================================
    // 🔵 LOW - High-Frequency Reads
    // ========================================
    {
        pattern: /^\/api\/scheduler\/status/,
        limit: 120,
        window: 60, // 120 requests per minute (2/sec)
        description: 'Scheduler status polling'
    },
    {
        pattern: /^\/api\/notifications/,
        limit: 150,
        window: 60, // 150 requests per minute
        description: 'Notifications polling'
    },
    {
        pattern: /^\/api\/dashboard/,
        limit: 100,
        window: 60, // 100 requests per minute
        description: 'Dashboard data refresh'
    },
    {
        pattern: /^\/api\/admin\/stats/,
        limit: 100,
        window: 60, // 100 requests per minute
        description: 'Admin statistics'
    },

    // ========================================
    // DEFAULT - All Other APIs
    // ========================================
    {
        pattern: /^\/api\//, // Default API limit
        limit: 300,
        window: 60, // 300 requests per minute
        description: 'Default API limit'
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
            // Enhanced logging
            console.warn(`⚠️ Rate limit exceeded`, {
                ip,
                path,
                rule: rule.description || 'Unknown',
                limit: rule.limit,
                window: rule.window,
                retryAfter: Math.ceil(result.msBeforeNext / 1000)
            });

            return new NextResponse(
                JSON.stringify({
                    error: 'Too Many Requests',
                    message: `Please try again in ${Math.ceil(result.msBeforeNext / 1000)} seconds.`,
                    limit: rule.limit,
                    window: rule.window
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
