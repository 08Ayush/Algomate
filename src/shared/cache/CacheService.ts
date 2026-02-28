import { Redis } from '@upstash/redis';

export class CacheService {
    private redis: Redis | null = null;
    private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();
    private useRedis: boolean = false;

    constructor() {
        // Try to connect to Upstash Redis REST if available
        const url = process.env.UPSTASH_REDIS_REST_URL;
        const token = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (url && token && url.startsWith('https://')) {
            try {
                this.redis = new Redis({ url, token });
                this.useRedis = true;
                console.log('✅ Cache: Upstash Redis REST connected');
            } catch (error) {
                console.warn('⚠️ Cache: Redis failed, falling back to memory cache');
                this.useRedis = false;
            }
        } else {
            console.log('💡 Cache: Using in-memory cache (set UPSTASH_REDIS_REST_URL + TOKEN for Redis)');
        }
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            if (this.useRedis && this.redis) {
                // @upstash/redis auto-deserialises JSON
                const value = await this.redis.get<T>(key);
                if (value === null || value === undefined) return null;
                return value;
            } else {
                // Memory cache
                const cached = this.memoryCache.get(key);
                if (!cached) return null;

                // Check expiration
                if (Date.now() > cached.expiresAt) {
                    this.memoryCache.delete(key);
                    return null;
                }

                return cached.value as T;
            }
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set value in cache with TTL (time to live in seconds)
     */
    async set(key: string, value: any, ttl: number = 300): Promise<void> {
        try {
            if (this.useRedis && this.redis) {
                // @upstash/redis auto-serialises & uses { ex: seconds } for TTL
                await this.redis.set(key, value, { ex: ttl });
            } else {
                // Memory cache
                this.memoryCache.set(key, {
                    value,
                    expiresAt: Date.now() + ttl * 1000,
                });
            }
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    /**
     * Delete key from cache
     */
    async delete(key: string): Promise<void> {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.del(key);
            } else {
                this.memoryCache.delete(key);
            }
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }

    /**
     * Delete keys matching pattern
     */
    async deletePattern(pattern: string): Promise<void> {
        try {
            if (this.useRedis && this.redis) {
                const keys: string[] = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                }
            } else {
                // Memory cache - simple pattern matching
                const keysToDelete = Array.from(this.memoryCache.keys()).filter((key) =>
                    this.matchPattern(key, pattern)
                );
                keysToDelete.forEach((key) => this.memoryCache.delete(key));
            }
        } catch (error) {
            console.error('Cache deletePattern error:', error);
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        try {
            if (this.useRedis && this.redis) {
                await this.redis.flushall();
            } else {
                this.memoryCache.clear();
            }
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Simple pattern matching for memory cache
     */
    private matchPattern(key: string, pattern: string): boolean {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(key);
    }

    /**
     * Close Redis connection (no-op for @upstash/redis REST client)
     */
    async disconnect(): Promise<void> {
        // @upstash/redis is stateless HTTP — nothing to close
        this.redis = null;
        this.useRedis = false;
    }
}

// Singleton instance
export const cacheService = new CacheService();
