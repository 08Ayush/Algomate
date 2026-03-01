const { Redis } = require('@upstash/redis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

async function measureLatency() {
    console.log('\n--- 🌍 Cross-Region Latency Analysis ---');
    console.log(`Targeting Redis: ${redisUrl}`);

    if (!redisUrl || !redisToken) {
        console.error('❌ ERROR: Missing Redis credentials.');
        return;
    }

    const redis = new Redis({
        url: redisUrl,
        token: redisToken,
    });

    const latencies = [];
    const ROUNDS = 5;

    console.log(`\nRunning ${ROUNDS} test rounds...`);

    for (let i = 1; i <= ROUNDS; i++) {
        const start = Date.now();
        try {
            // Use a unique key to prevent any weird edge-caching
            await redis.get(`latency_test_${Date.now()}`);
            const duration = Date.now() - start;
            latencies.push(duration);
            console.log(`Round ${i}: ${duration}ms`);
        } catch (err) {
            console.error(`Round ${i} failed:`, err.message);
        }
    }

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);

    console.log('\n--- 📊 Results ---');
    console.log(`Average Latency: ${avg.toFixed(1)}ms`);
    console.log(`Best Round: ${min}ms`);

    if (avg > 150) {
        console.log('\n🚨 HIGH LATENCY DETECTED (>150ms)');
        console.log('Diagnosis: Your Redis database is likely in US/Europe while you are in India.');
        console.log('Impact: This makes every cache check SLOWER than a database query.');
        console.log('Action: Move Redis to ap-south-1 (Mumbai).');
    } else if (avg < 50) {
        console.log('\n✅ LOW LATENCY (<50ms)');
        console.log('Diagnosis: Connection is excellent. Redis is local.');
    } else {
        console.log('\n⚠️ MODERATE LATENCY (50-150ms)');
        console.log('Diagnosis: Usable, but not optimal for high-performance caching.');
    }
}

measureLatency();
