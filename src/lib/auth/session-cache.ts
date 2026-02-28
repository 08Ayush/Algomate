/**
 * Session Cache
 * Reduces DB lookups by caching authenticated user sessions in memory
 * This significantly improves API response times
 */

import { AuthUser } from '@/shared/middleware/auth';

interface CacheEntry {
    user: AuthUser;
    expiresAt: number;
}

class SessionCache {
    private cache: Map<string, CacheEntry> = new Map();
    private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes cache

    /**
     * Get cached user session
     */
    get(userId: string): AuthUser | null {
        const entry = this.cache.get(userId);
        
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(userId);
            return null;
        }

        return entry.user;
    }

    /**
     * Store user session in cache
     */
    set(userId: string, user: AuthUser): void {
        this.cache.set(userId, {
            user,
            expiresAt: Date.now() + this.TTL_MS
        });
    }

    /**
     * Remove user session from cache
     */
    delete(userId: string): void {
        this.cache.delete(userId);
    }

    /**
     * Clear all cached sessions
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clean up expired entries (called periodically)
     */
    cleanup(): void {
        const now = Date.now();
        for (const [userId, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(userId);
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            ttlMs: this.TTL_MS
        };
    }
}

// Singleton instance
export const sessionCache = new SessionCache();

// Cleanup expired entries every minute
if (typeof setInterval !== 'undefined') {
    setInterval(() => sessionCache.cleanup(), 60 * 1000);
}
