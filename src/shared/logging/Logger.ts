import pino from 'pino';

/**
 * Structured Logger Service using Pino
 * Provides consistent logging across the application
 */
export class Logger {
    private logger: pino.Logger;
    private static instance: Logger;

    private constructor() {
        this.logger = pino({
            level: process.env.LOG_LEVEL || 'info',
            transport:
                process.env.NODE_ENV === 'development'
                    ? {
                        target: 'pino-pretty',
                        options: {
                            colorize: true,
                            translateTime: 'SYS:standard',
                            ignore: 'pid,hostname',
                        },
                    }
                    : undefined,
            formatters: {
                level: (label) => {
                    return { level: label };
                },
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
        this.logger.debug(context || {}, message);
    }

    /**
     * Info level log
     */
    info(message: string, context?: object): void {
        this.logger.info(context || {}, message);
    }

    /**
     * Warning level log
     */
    warn(message: string, context?: object): void {
        this.logger.warn(context || {}, message);
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
        this.logger.error(errorContext, message);
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
        this.logger.fatal(errorContext, message);
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
