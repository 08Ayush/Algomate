import { Redis } from '@upstash/redis';
import { logger } from '@/shared/logging';

/**
 * JSON Reviver for Date objects
 */
function dateReviver(_key: string, value: any): any {
    if (typeof value === 'string') {
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
        if (dateRegex.test(value)) {
            return new Date(value);
        }
    }
    return value;
}

interface L1CacheItem<T> {
    value: T;
    expiry: number;
}

export class RedisCacheService {
    // @upstash/redis uses HTTP REST — no TCP sockets, no worker threads.
    // Lazily initialised so module-level import does not throw at build time.
    private client: Redis | null = null;
    private readonly L1_TTL_MS = 60 * 1000; // 60 seconds

    // L1 Cache (in-memory, < 0.1 ms)
    private l1Cache = new Map<string, L1CacheItem<any>>();

    private getClient(): Redis | null {
        if (this.client) return this.client;

        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!url || !token) {
            // Redis is optional — app continues without cache.
            return null;
        }

        // @upstash/redis requires an HTTPS REST URL.
        // Guard against the legacy rediss:// TCP format being set.
        if (!url.startsWith('https://')) {
            logger.warn(
                'UPSTASH_REDIS_REST_URL does not start with https://. ' +
                'Cache is disabled. Provide the Upstash REST URL, not the ioredis connection string.'
            );
            return null;
        }

        try {
            this.client = new Redis({ url, token });
            logger.info('Upstash Redis REST client initialised');
        } catch (err) {
            logger.error('Failed to initialise Upstash Redis client:', err as Error);
            return null;
        }

        return this.client;
    }

    // -------------------------------------------------------------------------
    // L1 — in-process memory (< 0.1 ms)
    // -------------------------------------------------------------------------

    getL1<T>(key: string): T | null {
        const now = Date.now();
        const item = this.l1Cache.get(key);
        if (item && item.expiry > now) return item.value as T;
        return null;
    }

    // -------------------------------------------------------------------------
    // L2 — Upstash Redis REST (~30–60 ms over network)
    // -------------------------------------------------------------------------

    async getL2<T>(key: string): Promise<T | null> {
        const redis = this.getClient();
        if (!redis) return null;

        try {
            const data = await redis.get<T>(key);
            if (data === null || data === undefined) return null;

            // Also warm L1
            this.l1Cache.set(key, { value: data, expiry: Date.now() + this.L1_TTL_MS });
            return data;
        } catch (error) {
            logger.error('Redis GET error:', error as Error);
            return null;
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const l1 = this.getL1<T>(key);
        if (l1 !== null) return l1;
        return this.getL2<T>(key);
    }

    async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        // Always warm L1
        this.l1Cache.set(key, {
            value,
            expiry: Date.now() + Math.min(ttlSeconds * 1000, this.L1_TTL_MS),
        });

        const redis = this.getClient();
        if (!redis) return;

        try {
            await redis.set(key, value, { ex: ttlSeconds });
        } catch (error) {
            logger.error('Redis SET error:', error as Error);
        }
    }

    async del(key: string): Promise<void> {
        this.l1Cache.delete(key);

        const redis = this.getClient();
        if (!redis) return;

        try {
            await redis.del(key);
        } catch (error) {
            logger.error('Redis DEL error:', error as Error);
        }
    }

    async invalidatePattern(pattern: string): Promise<number> {
        // Clear all L1 on pattern invalidation to be safe
        this.l1Cache.clear();

        const redis = this.getClient();
        if (!redis) return 0;

        try {
            const keys = await redis.keys(pattern);
            if (keys.length === 0) return 0;
            await redis.del(...keys);
            return keys.length;
        } catch (error) {
            logger.error('Redis invalidatePattern error:', error as Error);
            return 0;
        }
    }

    isAvailable(): boolean {
        return this.getClient() !== null;
    }

    buildKey(collegeId: string, module: string, resource: string, identifier?: string): string {
        const parts = ['college', collegeId, module, resource];
        if (identifier) parts.push(identifier);
        return parts.join(':');
    }
}

export const redisCache = new RedisCacheService();
export default redisCache;
