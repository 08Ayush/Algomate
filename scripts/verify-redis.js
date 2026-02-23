
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

// Load environment variables from .env
dotenv.config();

async function verifyRedis() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    console.log('--- Redis Verification ---');
    console.log(`URL: ${url ? 'Found' : 'MISSING'}`);
    console.log(`Token: ${token ? 'Found' : 'MISSING'}`);

    if (!url || !token) {
        console.error('Error: Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your .env file.');
        process.exit(1);
    }

    try {
        const redis = new Redis({
            url: url,
            token: token,
        });

        console.log('Connecting to Upstash Redis...');

        // Test basic set/get
        const testKey = 'connection_test_at_' + Date.now();
        const testValue = { status: 'success', timestamp: new Date().toISOString() };

        console.log(`Setting test key: ${testKey}`);
        await redis.set(testKey, JSON.stringify(testValue), { ex: 60 });

        console.log('Retrieving test key...');
        const result = await redis.get(testKey);

        console.log('Result:', result);

        if (result && typeof result === 'object' && result.status === 'success') {
            console.log('\n✅ SUCCESS: Redis is connected and working correctly!');
        } else if (typeof result === 'string' && result.includes('success')) {
            console.log('\n✅ SUCCESS: Redis is connected and working correctly!');
        } else {
            console.log('\n❌ FAILURE: Could not verify data integrity.');
        }

        // Cleanup
        await redis.del(testKey);

    } catch (error) {
        console.error('\n❌ ERROR: Failed to connect to Redis:');
        console.error(error);
    }
}

verifyRedis();
