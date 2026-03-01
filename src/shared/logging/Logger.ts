import pino from 'pino';

// ---------------------------------------------------------------------------
// Build a pino-pretty destination stream **synchronously** in development.
// The default `transport: { target: 'pino-pretty' }` spins up a WORKER THREAD.
// If that worker crashes (e.g. rapid error floods), every subsequent
// `this.logger.*()` call throws "the worker has exited" — an uncaught
// exception that kills the server.
//
// Using `pino-pretty`'s `PinoPretty()` as a synchronous stream avoids the
// worker entirely while keeping colourised dev output.
// ---------------------------------------------------------------------------
function buildDevStream(): pino.DestinationStream | undefined {
    if (process.env.NODE_ENV !== 'development') return undefined;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const PinoPretty = require('pino-pretty');
        return PinoPretty({
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        });
    } catch {
        // pino-pretty not installed — fall back to plain JSON
        return undefined;
    }
}

/**
 * Structured Logger Service using Pino
 * Provides consistent logging across the application
 */
export class Logger {
    private logger: pino.Logger;
    private static instance: Logger;

    private constructor() {
        const devStream = buildDevStream();
        // pino defaults to stdout when no destination is provided.
        // In Edge/middleware runtime, pino/browser.js is used which lacks
        // pino.destination() — so we must NOT call it. Only pass the stream
        // when we actually have one (i.e. pino-pretty in Node.js dev mode).
        this.logger = devStream
            ? pino(
                {
                    level: process.env.LOG_LEVEL || 'info',
                    formatters: {
                        level: (label) => ({ level: label }),
                    },
                    base: {
                        env: process.env.NODE_ENV,
                    },
                },
                devStream,
            )
            : pino({
                level: process.env.LOG_LEVEL || 'info',
                formatters: {
                    level: (label) => ({ level: label }),
                },
                base: {
                    env: process.env.NODE_ENV,
                },
            });
    }

    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * Create child logger with context
     */
    child(context: object): pino.Logger {
        return this.logger.child(context);
    }

    /**
     * Debug level log
     */
    debug(message: string, context?: object): void {
        try {
            this.logger.debug(context || {}, message);
        } catch {
            // pino-pretty worker may have exited; fall back to console
            console.debug('[DEBUG]', message, context || {});
        }
    }

    /**
     * Info level log
     */
    info(message: string, context?: object): void {
        try {
            this.logger.info(context || {}, message);
        } catch {
            console.info('[INFO]', message, context || {});
        }
    }

    /**
     * Warning level log
     */
    warn(message: string, context?: object): void {
        try {
            this.logger.warn(context || {}, message);
        } catch {
            console.warn('[WARN]', message, context || {});
        }
    }

    /**
     * Error level log
     */
    error(message: string, error?: Error, context?: object): void {
        const errorContext = {
            ...context,
            error: error
                ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                }
                : undefined,
        };
        try {
            this.logger.error(errorContext, message);
        } catch {
            // Guard against 'the worker has exited' thrown by pino-pretty
            // transport when its worker thread crashes (e.g. due to repeated
            // error floods). Using console.error ensures the error is still
            // visible without crashing the calling handler.
            console.error('[ERROR]', message, errorContext);
        }
    }

    /**
     * Fatal level log
     */
    fatal(message: string, error?: Error, context?: object): void {
        const errorContext = {
            ...context,
            error: error
                ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                }
                : undefined,
        };
        try {
            this.logger.fatal(errorContext, message);
        } catch {
            console.error('[FATAL]', message, errorContext);
        }
    }

    /**
     * Log use case execution
     */
    logUseCaseExecution(
        useCaseName: string,
        phase: 'start' | 'success' | 'error',
        context?: object
    ): void {
        const logContext = {
            useCase: useCaseName,
            phase,
            ...context,
        };

        if (phase === 'error') {
            this.error(`Use case ${useCaseName} failed`, undefined, logContext);
        } else if (phase === 'success') {
            this.info(`Use case ${useCaseName} completed`, logContext);
        } else {
            this.debug(`Use case ${useCaseName} started`, logContext);
        }
    }

    /**
     * Log API request
     */
    logApiRequest(
        method: string,
        path: string,
        statusCode: number,
        duration: number,
        context?: object
    ): void {
        this.info('API Request', {
            method,
            path,
            statusCode,
            duration,
            ...context,
        });
    }

    /**
     * Log database query
     */
    logDatabaseQuery(
        operation: string,
        table: string,
        duration: number,
        context?: object
    ): void {
        this.debug('Database Query', {
            operation,
            table,
            duration,
            ...context,
        });
    }
}

// Export singleton instance
export const logger = Logger.getInstance();
