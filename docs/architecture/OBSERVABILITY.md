# Observability Infrastructure

## Overview

Comprehensive observability implementation with structured logging, metrics collection, distributed tracing, and performance monitoring.

---

## 1. Structured Logging 📝

**Location:** `src/shared/logging/`

**Features:**
- Pino-based structured logging
- Multiple log levels (debug, info, warn, error, fatal)
- Colored output in development
- JSON format in production
- Contextual logging with metadata

**Usage:**

```typescript
import { logger } from '@/shared/logging';

// Basic logging
logger.info('User logged in', { userId: '123', email: 'user@example.com' });
logger.error('Database connection failed', error, { retries: 3 });

// Use case logging
logger.logUseCaseExecution('CreateBucket', 'success', { bucketId: '456' });

// API request logging
logger.logApiRequest('POST', '/api/buckets', 201, 145);

// Database query logging
logger.logDatabaseQuery('INSERT', 'elective_buckets', 23);
```

**Log Levels:**
- `debug` - Detailed information for debugging
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error conditions
- `fatal` - Fatal errors that require immediate attention

---

## 2. Metrics Collection 📊

**Location:** `src/shared/metrics/`

**Features:**
- Prometheus-compatible metrics
- Counters, Histograms, and Gauges
- HTTP request metrics
- Use case execution metrics
- Database query metrics
- Cache metrics
- Event metrics

**Exposed Endpoint:** `/api/metrics`

**Available Metrics:**

```
# HTTP Requests
http_requests_total{method, path, status}
http_request_duration_ms{method, path, status}

# Use Cases
use_case_executions_total{useCase, status}
use_case_execution_duration_ms{useCase}

# Database
database_queries_total{operation, table}
database_query_duration_ms{operation, table}

# Cache
cache_hits_total{key}
cache_misses_total{key}

# Events
events_published_total{eventType}
```

**Usage:**

```typescript
import { metrics } from '@/shared/metrics';

// Record HTTP request
metrics.recordHttpRequest('POST', '/api/buckets', 201, 145);

// Record use case execution
metrics.recordUseCaseExecution('CreateBucket', 234, true);

// Record database query
metrics.recordDatabaseQuery('INSERT', 'elective_buckets', 23);

// Record cache hit/miss
metrics.recordCacheHit('bucket:123');
metrics.recordCacheMiss('bucket:456');
```

---

## 3. Distributed Tracing 🔍

**Location:** `src/shared/logging/CorrelationId.ts`

**Features:**
- Correlation IDs for request tracking
- Automatic ID generation
- ID propagation through headers
- Request lifecycle tracking

**Usage:**

```typescript
import { withCorrelationId } from '@/shared/logging';

// In API route
export const POST = withCorrelationId(async (request, correlationId) => {
  // correlationId is automatically injected
  logger.info('Processing request', { correlationId });
  
  // Your logic here
  
  return NextResponse.json({ success: true });
});
```

**Headers:**
- Request: `x-correlation-id` (auto-generated if missing)
- Response: `x-correlation-id` (same as request)

---

## 4. Performance Monitoring ⚡

**Location:** `src/shared/metrics/decorators/`

**Decorators:**

### @Timed
Measures method execution time and records metrics.

```typescript
import { Timed } from '@/shared/metrics';

export class CreateBucketUseCase {
  @Timed('CreateBucket')
  async execute(dto: CreateBucketDto): Promise<Result> {
    // Implementation
  }
}
```

**Features:**
- Records execution duration
- Logs slow executions (>1s) as warnings
- Tracks success/failure rate
- Automatic error handling

### @TrackQuery
Tracks database query performance.

```typescript
import { TrackQuery } from '@/shared/metrics';

export class SupabaseBucketRepository {
  @TrackQuery('INSERT', 'elective_buckets')
  async create(data: BucketData): Promise<Bucket> {
    // Implementation
  }
}
```

---

## Setup & Configuration

### Environment Variables

```env
# Logging
LOG_LEVEL=info              # debug, info, warn, error, fatal
NODE_ENV=development        # development, production

# Metrics (optional)
METRICS_ENABLED=true
```

### Prometheus Setup (Optional)

1. **Install Prometheus:**
```bash
docker run -p 9090:9090 prom/prometheus
```

2. **Configure Prometheus** (`prometheus.yml`):
```yaml
scrape_configs:
  - job_name: 'academic-campus'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

3. **Access Metrics:**
- App Metrics: `http://localhost:3000/api/metrics`
- Prometheus UI: `http://localhost:9090`

### Grafana Setup (Optional)

1. **Install Grafana:**
```bash
docker run -p 3001:3000 grafana/grafana
```

2. **Add Prometheus data source**
3. **Import dashboards** for Node.js/Next.js

---

## Best Practices

### 1. Logging

✅ **Do:**
- Use structured logging with context
- Log important business events
- Include correlation IDs
- Use appropriate log levels

❌ **Don't:**
- Log sensitive data (passwords, tokens)
- Over-log in production
- Use console.log directly

### 2. Metrics

✅ **Do:**
- Track critical business metrics
- Use appropriate metric types
- Keep cardinality low (avoid unique IDs in labels)

❌ **Don't:**
- Create too many metrics
- Use high-cardinality labels

### 3. Performance

✅ **Do:**
- Monitor slow operations
- Set performance budgets
- Use decorators consistently

❌ **Don't:**
- Ignore performance warnings
- Skip monitoring in production

---

## Monitoring Dashboard

### Key Metrics to Watch

1. **Availability:**
   - HTTP request success rate
   - Error rate

2. **Performance:**
   - Request duration (p50, p95, p99)
   - Database query duration
   - Use case execution time

3. **Throughput:**
   - Requests per second
   - Use case executions per minute

4. **Resources:**
   - Cache hit/miss ratio
   - Active connections

---

## Example: Full Integration

```typescript
import { logger } from '@/shared/logging';
import { metrics, Timed } from '@/shared/metrics';
import { withCorrelationId } from '@/shared/logging';

export class CreateBucketUseCase {
  @Timed('CreateBucket')
  async execute(dto: CreateBucketDto): Promise<Result> {
    logger.logUseCaseExecution('CreateBucket', 'start', { batchId: dto.batch_id });

    try {
      const bucket = await this.repository.create(dto);
      
      logger.logUseCaseExecution('CreateBucket', 'success', { 
        bucketId: bucket.id 
      });

      return { success: true, bucket };
    } catch (error) {
      logger.logUseCaseExecution('CreateBucket', 'error', { 
        error: (error as Error).message 
      });
      throw error;
    }
  }
}

// In API route
export const POST = withCorrelationId(async (request, correlationId) => {
  const startTime = Date.now();
  
  try {
    const result = await useCase.execute(dto);
    const duration = Date.now() - startTime;
    
    metrics.recordHttpRequest('POST', '/api/buckets', 201, duration);
    
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.recordHttpRequest('POST', '/api/buckets', 500, duration);
    throw error;
  }
});
```

---

## ✅ Implementation Complete!

All observability features are now implemented and ready to use! 🎉

**Access Points:**
- Metrics: `http://localhost:3000/api/metrics`
- Logs: Check console (dev) or log files (production)
