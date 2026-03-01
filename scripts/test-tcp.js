const Redis = require('ioredis');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/^UPSTASH_REDIS_REST_URL=https:\/\/(.*)$/m);
const tokenMatch = env.match(/^UPSTASH_REDIS_REST_TOKEN=(.*)$/m);

if (!urlMatch || !tokenMatch) {
    console.error('Could not find Redis credentials in .env');
    process.exit(1);
}

const host = urlMatch[1].trim();
const password = tokenMatch[1].trim();

console.log(`Testing TCP Latency (ioredis) to: ${host}`);

const redis = new Redis({
    host: host,
    port: 6379,
    password: password,
    tls: {
        rejectUnauthorized: false // Upstash uses valid certs but sometimes local env has issues
    },
    connectTimeout: 5000
});

async function runTest() {
    const latencies = [];
    const rounds = 10;

    try {
        // First call to establish connection
        await redis.get('test_connection');
        console.log('Connection established.');

        for (let i = 1; i <= rounds; i++) {
            const start = Date.now();
            await redis.get(`latency_test_${Date.now()}`);
            const duration = Date.now() - start;
            latencies.push(duration);
            console.log(`Round ${i}: ${duration}ms`);
        }

        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\nAverage TCP Latency: ${avg.toFixed(2)}ms`);

        if (avg < 30) {
            console.log('✅ TCP target achieved!');
        } else {
            console.log('⚠️ Still slightly high, but likely better than HTTP.');
        }

    } catch (err) {
        console.error('TCP Connection failed:', err.message);
    } finally {
        redis.disconnect();
    }
}

runTest();
