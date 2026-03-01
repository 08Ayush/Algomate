import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function run() {
    console.log('--- Network Latency Test ---');

    for (let i = 1; i <= 3; i++) {
        const start = Date.now();
        await redis.get('nonexistent_key_' + Math.random());
        console.log(`Round ${i} Latency: ${Date.now() - start}ms`);
    }
}

run();
