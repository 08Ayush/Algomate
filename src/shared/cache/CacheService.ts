import Redis from 'ioredis';

export class CacheService {
    private redis: Redis | null = null;
    private memoryCache: Map<string, { value: any; expiresAt: number }> = new Map();
    private useRedis: boolean = false;

    constructor() {
        // Try to connect to Redis if available
        if (process.env.REDIS_URL) {
            try {
                this.redis = new Redis(process.env.REDIS_URL);
                this.useRedis = true;
                console.log('✅ Cache: Redis connected');
            } catch (error) {
                console.warn('⚠️ Cache: Redis failed, falling back to memory cache');
                this.useRedis = false;
            }
        } else {
            console.log('💡 Cache: Using in-memory cache (set REDIS_URL for Redis)');
        }
    }

    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            if (this.useRedis && this.redis) {
                const value = await this.redis.get(key);
                if (!value) return null;
                return JSON.parse(value) as T;
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
                await this.redis.setex(key, ttl, JSON.stringify(value));
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
                const keys = await this.redis.keys(pattern);
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
                await this.redis.flushdb();
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
     * Close Redis connection
     */
    async disconnect(): Promise<void> {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}

// Singleton instance
export const cacheService = new CacheService();
