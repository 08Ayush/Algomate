import { Registry, Counter, Histogram, Gauge } from 'prom-client';

/**
 * Metrics Service using Prometheus
 * Collects application metrics for monitoring
 */
export class MetricsService {
    private static instance: MetricsService;
    private registry: Registry;

    // Counters
    public httpRequestsTotal: Counter;
    public useCaseExecutionsTotal: Counter;
    public databaseQueriesTotal: Counter;
    public cacheHitsTotal: Counter;
    public cacheMissesTotal: Counter;
    public eventsPublishedTotal: Counter;

    // Histograms
    public httpRequestDuration: Histogram;
    public useCaseExecutionDuration: Histogram;
    public databaseQueryDuration: Histogram;

    // Gauges
    public activeConnections: Gauge;

    private constructor() {
        this.registry = new Registry();

        // HTTP Request metrics
        this.httpRequestsTotal = new Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'path', 'status'],
            registers: [this.registry],
        });

        this.httpRequestDuration = new Histogram({
            name: 'http_request_duration_ms',
            help: 'HTTP request duration in milliseconds',
            labelNames: ['method', 'path', 'status'],
            buckets: [10, 50, 100, 300, 500, 1000, 3000, 5000],
            registers: [this.registry],
        });

        // Use Case metrics
        this.useCaseExecutionsTotal = new Counter({
            name: 'use_case_executions_total',
            help: 'Total number of use case executions',
            labelNames: ['useCase', 'status'],
            registers: [this.registry],
        });

        this.useCaseExecutionDuration = new Histogram({
            name: 'use_case_execution_duration_ms',
            help: 'Use case execution duration in milliseconds',
            labelNames: ['useCase'],
            buckets: [10, 50, 100, 300, 500, 1000, 3000],
            registers: [this.registry],
        });

        // Database metrics
        this.databaseQueriesTotal = new Counter({
            name: 'database_queries_total',
            help: 'Total number of database queries',
            labelNames: ['operation', 'table'],
            registers: [this.registry],
        });

        this.databaseQueryDuration = new Histogram({
            name: 'database_query_duration_ms',
            help: 'Database query duration in milliseconds',
            labelNames: ['operation', 'table'],
            buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
            registers: [this.registry],
        });

        // Cache metrics
        this.cacheHitsTotal = new Counter({
            name: 'cache_hits_total',
            help: 'Total number of cache hits',
            labelNames: ['key'],
            registers: [this.registry],
        });

        this.cacheMissesTotal = new Counter({
            name: 'cache_misses_total',
            help: 'Total number of cache misses',
            labelNames: ['key'],
            registers: [this.registry],
        });

        // Event metrics
        this.eventsPublishedTotal = new Counter({
            name: 'events_published_total',
            help: 'Total number of events published',
            labelNames: ['eventType'],
            registers: [this.registry],
        });

        // Connection metrics
        this.activeConnections = new Gauge({
            name: 'active_connections',
            help: 'Number of active connections',
            registers: [this.registry],
        });
    }

    static getInstance(): MetricsService {
        if (!MetricsService.instance) {
            MetricsService.instance = new MetricsService();
        }
        return MetricsService.instance;
    }

    /**
     * Get metrics in Prometheus format
     */
    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    /**
     * Record HTTP request
     */
    recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
        this.httpRequestsTotal.inc({ method, path, status: statusCode.toString() });
        this.httpRequestDuration.observe({ method, path, status: statusCode.toString() }, duration);
    }

    /**
     * Record use case execution
     */
    recordUseCaseExecution(useCaseName: string, duration: number, success: boolean): void {
        this.useCaseExecutionsTotal.inc({ useCase: useCaseName, status: success ? 'success' : 'error' });
        this.useCaseExecutionDuration.observe({ useCase: useCaseName }, duration);
    }

    /**
     * Record database query
     */
    recordDatabaseQuery(operation: string, table: string, duration: number): void {
        this.databaseQueriesTotal.inc({ operation, table });
        this.databaseQueryDuration.observe({ operation, table }, duration);
    }

    /**
     * Record cache hit
     */
    recordCacheHit(key: string): void {
        this.cacheHitsTotal.inc({ key });
    }

    /**
     * Record cache miss
     */
    recordCacheMiss(key: string): void {
        this.cacheMissesTotal.inc({ key });
    }

    /**
     * Record event published
     */
    recordEventPublished(eventType: string): void {
        this.eventsPublishedTotal.inc({ eventType });
    }
}

// Export singleton instance
export const metrics = MetricsService.getInstance();
