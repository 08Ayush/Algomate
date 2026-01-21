import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../Logger';

/**
 * Correlation ID for request tracking
 * Allows tracing a request through the entire system
 */

const CORRELATION_ID_HEADER = 'x-correlation-id';

export class CorrelationId {
    private static storage = new Map<string, string>();

    /**
     * Generate or extract correlation ID from request
     */
    static fromRequest(request: NextRequest): string {
        const existingId = request.headers.get(CORRELATION_ID_HEADER);
        return existingId || randomUUID();
    }

    /**
     * Set correlation ID in current context
     */
    static set(id: string): void {
        // In a real implementation, use AsyncLocalStorage for Node.js
        this.storage.set('current', id);
    }

    /**
     * Get current correlation ID
     */
    static get(): string | undefined {
        return this.storage.get('current');
    }

    /**
     * Add correlation ID to response headers
     */
    static addToResponse(response: NextResponse, correlationId: string): NextResponse {
        response.headers.set(CORRELATION_ID_HEADER, correlationId);
        return response;
    }
}

/**
 * Middleware to add correlation ID to all requests
 */
export function withCorrelationId(
    handler: (request: NextRequest, correlationId: string) => Promise<NextResponse>
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const correlationId = CorrelationId.fromRequest(request);
        CorrelationId.set(correlationId);

        logger.info('Request started', {
            correlationId,
            method: request.method,
            url: request.url,
        });

        const startTime = Date.now();

        try {
            const response = await handler(request, correlationId);
            const duration = Date.now() - startTime;

            logger.logApiRequest(
                request.method,
                new URL(request.url).pathname,
                response.status,
                duration,
                { correlationId }
            );

            return CorrelationId.addToResponse(response, correlationId);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Request failed', error as Error, {
                correlationId,
                method: request.method,
                url: request.url,
                duration,
            });
            throw error;
        }
    };
}
