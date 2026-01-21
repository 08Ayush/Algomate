import { NextResponse } from 'next/server';
import { metrics } from '@/shared/metrics/MetricsService';

/**
 * Metrics API Endpoint
 * Exposes Prometheus metrics at /api/metrics
 */
export async function GET() {
    try {
        const metricsData = await metrics.getMetrics();

        return new NextResponse(metricsData, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; version=0.0.4',
            },
        });
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return NextResponse.json(
            { error: 'Failed to fetch metrics' },
            { status: 500 }
        );
    }
}
