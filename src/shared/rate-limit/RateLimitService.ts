// Pure in-memory rate limiting (no Redis dependency)
// Works perfectly for development and small-scale deployments

interface RateLimitConfig {
    points: number;      // Number of requests
    duration: number;    // Window size in seconds
}

interface RateLimitResult {
    allowed: boolean;
    remainingPoints: number;
    msBeforeNext: number;
}

export class RateLimitService {
    private readonly memoryStore = new Map<string, number[]>();

    constructor() {
        console.log('ℹ️ RateLimit: Using in-memory storage (no Redis)');
    }

    /**
     * Check rate limit for a given key
     * Using simple sliding window algorithm
     */
    async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
        const NOW = Date.now();
        const WINDOW_MS = config.duration * 1000;

        // In-Memory Implementation
        const timestamps = this.memoryStore.get(key) || [];

        // Filter out old timestamps outside the window
        const validTimestamps = timestamps.filter(t => t > NOW - WINDOW_MS);

        if (validTimestamps.length < config.points) {
            // Allow request
            validTimestamps.push(NOW);
            this.memoryStore.set(key, validTimestamps);

            return {
                allowed: true,
                remainingPoints: config.points - validTimestamps.length,
                msBeforeNext: 0
            };
        } else {
            // Deny request
            const oldest = validTimestamps[0];
            const msBeforeNext = (oldest + WINDOW_MS) - NOW;

            return {
                allowed: false,
                remainingPoints: 0,
                msBeforeNext: Math.max(0, msBeforeNext)
            };
        }
    }
}

export const rateLimitService = new RateLimitService();
