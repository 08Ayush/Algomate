import { NextRequest, NextResponse } from 'next/server';

export function securityHeadersMiddleware(request: NextRequest) {
    const response = NextResponse.next();
    const headers = response.headers;

    // 1. DNS Prefetch Control
    headers.set('X-DNS-Prefetch-Control', 'on');

    // 2. Strict Transport Security (HSTS) - 1 year
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // 3. X-Frame-Options - Prevent clickjacking
    headers.set('X-Frame-Options', 'SAMEORIGIN');

    // 4. X-Content-Type-Options - Prevent MIME sniffing
    headers.set('X-Content-Type-Options', 'nosniff');

    // 5. Referrer Policy
    headers.set('Referrer-Policy', 'origin-when-cross-origin');

    // 6. X-XSS-Protection
    headers.set('X-XSS-Protection', '1; mode=block');

    // 7. Content Security Policy (Basis)
    // Note: A strict CSP can break things if not carefully tuned. 
    // Allowing 'self', 'unsafe-inline' (for Next.js scripts), and data/images.
    // Adjust as needed for external scripts (Google Analytics, etc.)
    const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co", // Allow Supabase
        "frame-ancestors 'none'",
    ];

    // headers.set('Content-Security-Policy', csp.join('; '));

    return response;
}
