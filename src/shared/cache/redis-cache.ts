import Redis from 'ioredis';
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
    private client: Redis | null = null;
    private isConnected: boolean = false;
    private failureCount: number = 0;
    private readonly MAX_FAILURES = 3;
    private readonly TIMEOUT_MS = 1000;

    // L1 Cache (Short-term memory to hit < 1ms response times)
    private l1Cache = new Map<string, L1CacheItem<any>>();
    private readonly L1_TTL_MS = 60 * 1000; // 60 seconds L1 TTL

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!redisUrl || !redisToken) {
            this.isConnected = false;
            return;
        }

        try {
            // Extract host from rest URL (https://host -> host)
            const host = redisUrl.replace('https://', '').trim();

            this.client = new Redis({
                host: host,
                port: 6379,
                password: redisToken,
                tls: { rejectUnauthorized: false },
                connectTimeout: 5000,
                maxRetriesPerRequest: 1
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                logger.info('🚀 Redis TCP (L2) connected successfully');
            });

            this.client.on('error', (err) => {
                logger.error('Redis TCP Error:', err);
                this.failureCount++;
                if (this.failureCount >= this.MAX_FAILURES) {
                    this.isConnected = false;
                }
            });

        } catch (error) {
            logger.error('Failed to initialize Redis TCP:', error as Error);
            this.isConnected = false;
        }
    }

    /**
     * Get from L1 (Memory) only - Speed: < 0.1ms
     */
    getL1<T>(key: string): T | null {
        const now = Date.now();
        const l1Item = this.l1Cache.get(key);
        if (l1Item && l1Item.expiry > now) {
            return l1Item.value as T;
        }
        return null;
    }

    /**
     * Get from L2 (Redis TCP) only - Speed: ~25-35ms
     */
    async getL2<T>(key: string): Promise<T | null> {
        if (!this.isConnected || !this.client) {
            return null;
        }

        try {
            const data = await this.client.get(key);
            if (!data) return null;

            let parsed: T;
            if (data.startsWith('{') || data.startsWith('[')) {
                parsed = JSON.parse(data, dateReviver) as T;
            } else {
                parsed = data as unknown as T;
            }

            // Update L1
            this.l1Cache.set(key, { value: parsed, expiry: Date.now() + this.L1_TTL_MS });
            return parsed;
        } catch (error) {
            return null;
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const l1 = this.getL1<T>(key);
        if (l1 !== null) return l1;

        return this.getL2<T>(key);
    }

    async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<void> {
        // Update L1
        this.l1Cache.set(key, {
            value,
            expiry: Date.now() + Math.min(ttlSeconds * 1000, this.L1_TTL_MS)
        });

        if (!this.isConnected || !this.client) return;

        try {
            const serialized = JSON.stringify(value);
            await this.client.set(key, serialized, 'EX', ttlSeconds);
        } catch (error) {
            // Silent ignore
        }
    }

    async del(key: string): Promise<void> {
        this.l1Cache.delete(key);
        if (!this.isConnected || !this.client) return;
        try {
            await this.client.del(key);
        } catch (error) {
            // Ignore
        }
    }

    async invalidatePattern(pattern: string): Promise<number> {
        // Clear all L1 on pattern invalidation to be safe
        this.l1Cache.clear();

        if (!this.isConnected || !this.client) return 0;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) return 0;
            await this.client.del(...keys);
            return keys.length;
        } catch (error) {
            return 0;
        }
    }

    isAvailable(): boolean {
        return this.isConnected;
    }

    buildKey(collegeId: string, module: string, resource: string, identifier?: string): string {
        const parts = ['college', collegeId, module, resource];
        if (identifier) parts.push(identifier);
        return parts.join(':');
    }
}

export const redisCache = new RedisCacheService();
export default redisCache;
