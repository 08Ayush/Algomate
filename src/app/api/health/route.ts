import { NextResponse } from 'next/server';
import { HealthChecker } from '@/shared/health/HealthChecker';

export async function GET() {
    const isAlive = await HealthChecker.checkLiveness();

    if (isAlive) {
        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
        });
    } else {
        return NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
}
