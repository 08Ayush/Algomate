import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

async function verify() {
    console.log('--- Redis Status Check ---');
    console.log(`Target URL: ${redisUrl}`);

    if (!redisUrl || !redisToken) {
        console.error('❌ ERROR: Missing Redis credentials in .env');
        return;
    }

    const redis = new Redis({
        url: redisUrl,
        token: redisToken,
    });

    try {
        const start = Date.now();
        console.log('Testing connection (setting key "test_attached")...');
        await redis.set('test_attached', 'true_v2', { ex: 60 });

        const value = await redis.get('test_attached');
        const duration = Date.now() - start;

        if (value === 'true_v2') {
            console.log(`✅ SUCCESS: Redis is ATTACHED and WORKING.`);
            console.log(`📊 Latency: ${duration}ms`);
        } else {
            console.log(`⚠️  WARNING: Redis returned unexpected value: ${value}`);
        }
    } catch (error) {
        console.error('❌ FAILED: Could not connect to Redis.');
        console.error('Error Details:', error instanceof Error ? error.message : error);

        if (error instanceof Error && error.message.includes('ENOTFOUND')) {
            console.log('\n💡 Tip: Your network cannot resolve the Upstash hostname. Check your internet connection or firewall.');
        }
    }
}

verify();
