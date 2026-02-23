import { metrics } from '../MetricsService';
import { logger } from '@/shared/logging/Logger';

/**
 * Decorator to measure execution time of methods
 * Records metrics and logs performance
 */
export function Timed(metricName?: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const methodName = metricName || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now();

            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - startTime;

                // Record metrics
                metrics.recordUseCaseExecution(methodName, duration, true);

                // Log performance
                if (duration > 1000) {
                    logger.warn(`Slow execution detected: ${methodName}`, {
                        duration,
                        method: methodName,
                    });
                } else {
                    logger.debug(`Execution completed: ${methodName}`, {
                        duration,
                        method: methodName,
                    });
                }

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;

                // Record failure metrics
                metrics.recordUseCaseExecution(methodName, duration, false);

                // Log error
                logger.error(`Execution failed: ${methodName}`, error as Error, {
                    duration,
                    method: methodName,
                });

                throw error;
            }
        };

        return descriptor;
    };
}

/**
 * Decorator to track database operations
 */
export function TrackQuery(operation: string, table: string) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now();

            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - startTime;

                // Record metrics
                metrics.recordDatabaseQuery(operation, table, duration);

                // Log query
                logger.logDatabaseQuery(operation, table, duration);

                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                logger.error(`Database query failed: ${operation} on ${table}`, error as Error, {
                    duration,
                    operation,
                    table,
                });
                throw error;
            }
        };

        return descriptor;
    };
}
