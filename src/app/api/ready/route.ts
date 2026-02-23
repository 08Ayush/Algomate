import { NextResponse } from 'next/server';
import { HealthChecker } from '@/shared/health/HealthChecker';

export async function GET() {
    const { isReady, details } = await HealthChecker.checkReadiness();

    if (isReady) {
        return NextResponse.json({
            status: 'ready',
            details,
            timestamp: new Date().toISOString()
        });
    } else {
        return NextResponse.json({
            status: 'not_ready',
            details,
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
}
