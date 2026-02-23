import { cacheService } from '../CacheService';

/**
 * Decorator for caching method results
 * 
 * @param keyGenerator - Function to generate cache key from method arguments
 * @param ttl - Time to live in seconds (default: 300)
 * 
 * @example
 * ```typescript
 * @Cacheable((id) => CacheKeys.COURSE_BY_ID(id), CacheTTL.LONG)
 * async findById(id: string): Promise<Course | null> {
 *   // Implementation
 * }
 * ```
 */
export function Cacheable(
    keyGenerator: (...args: any[]) => string,
    ttl: number = 300
) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const cacheKey = keyGenerator(...args);

            // Try to get from cache
            const cached = await cacheService.get(cacheKey);
            if (cached !== null) {
                console.log(`✅ Cache HIT: ${cacheKey}`);
                return cached;
            }

            // Cache miss - call original method
            console.log(`❌ Cache MISS: ${cacheKey}`);
            const result = await originalMethod.apply(this, args);

            // Store in cache if result is not null
            if (result !== null && result !== undefined) {
                await cacheService.set(cacheKey, result, ttl);
            }

            return result;
        };

        return descriptor;
    };
}

/**
 * Decorator for invalidating cache after method execution
 * 
 * @param keyOrPattern - Cache key or pattern to invalidate
 * 
 * @example
 * ```typescript
 * @CacheInvalidate((id) => CacheKeys.COURSE_BY_ID(id))
 * async update(id: string, data: Partial<Course>): Promise<Course> {
 *   // Implementation
 * }
 * ```
 */
export function CacheInvalidate(
    keyOrPattern: string | ((...args: any[]) => string)
) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            // Call original method
            const result = await originalMethod.apply(this, args);

            // Invalidate cache
            const key = typeof keyOrPattern === 'function'
                ? keyOrPattern(...args)
                : keyOrPattern;

            if (key.includes('*')) {
                await cacheService.deletePattern(key);
            } else {
                await cacheService.delete(key);
            }

            console.log(`🗑️ Cache invalidated: ${key}`);

            return result;
        };

        return descriptor;
    };
}
