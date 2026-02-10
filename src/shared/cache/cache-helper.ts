import { redisCache } from './redis-cache';
import { logger } from '@/shared/logging';

export interface CacheAsideOptions {
    /** Cache key */
    key: string;
    /** TTL in seconds (default: 1 hour) */
    ttl?: number;
    /** Whether to log cache hits/misses */
    enableLogging?: boolean;
}

export async function withCacheAside<T>(
    options: CacheAsideOptions,
    fetcher: () => Promise<T>
): Promise<T> {
    const { key, ttl = 3600, enableLogging = true } = options;

    try {
        // STEP 1: Instant L1 Hit (0ms) - Absolute zero lag
        const l1 = redisCache.getL1<T>(key);
        if (l1 !== null) return l1;

        // STEP 2: Racing Strategy (L1 Miss)
        // We start BOTH the L2 (Redis) lookup and the DB Fetch at the same time.
        // If L2 is a HIT (~30ms), it will almost always beat the DB (~150ms+).
        // If L2 is a MISS, the DB Fetch is already running and hasn't lost any time.

        const l2Promise = redisCache.getL2<T>(key);
        const dbPromise = fetcher();

        // Race them! But with a twist: if L2 returns null (miss), we MUST wait for DB.
        const result = await Promise.race([
            l2Promise.then(val => {
                if (val !== null) return val;
                // If L2 is a miss, we return a pending promise to stay in the race for DB
                return new Promise<T>(() => { });
            }),
            dbPromise
        ]);

        // If DB returned first, or L2 miss fallback
        if (result === undefined || result === null) {
            // Re-await DB just in case the race was won by a null L2 or similar
            const finalData = await dbPromise;
            // Background save to cache
            redisCache.set(key, finalData, ttl).catch(() => { });
            return finalData;
        }

        // If L2 won the race (it's non-null)
        // We don't need to re-save to cache since getL2 already updates L1
        return result;

    } catch (error) {
        logger.error(`Cache racing error for ${key}:`, error as Error);
        return await fetcher();
    }
}

export async function invalidateCache(key: string): Promise<void> {
    try {
        await redisCache.del(key);
        logger.info(`Cache invalidated: ${key}`);
    } catch (error) {
        logger.error(`Failed to invalidate cache for key ${key}:`, error as Error);
    }
}

export async function invalidateCachePattern(pattern: string): Promise<number> {
    try {
        const count = await redisCache.invalidatePattern(pattern);
        logger.info(`Cache pattern invalidated: ${pattern} (${count} keys)`);
        return count;
    } catch (error) {
        logger.error(`Failed to invalidate cache pattern ${pattern}:`, error as Error);
        return 0;
    }
}
