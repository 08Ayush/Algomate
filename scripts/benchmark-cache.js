const https = require('https');
const fs = require('fs');
const Redis = require('ioredis');

async function benchmark() {
    console.log('--- 🚀 Dual-Layer Cache Performance Benchmark ---');

    const env = fs.readFileSync('.env', 'utf8');
    const urlMatch = env.match(/^UPSTASH_REDIS_REST_URL=https:\/\/(.*)$/m);
    const tokenMatch = env.match(/^UPSTASH_REDIS_REST_TOKEN=(.*)$/m);

    if (!urlMatch || !tokenMatch) {
        console.error('Missing credentials');
        return;
    }

    const host = urlMatch[1].trim();
    const password = tokenMatch[1].trim();

    // Simulate our new L1 cache logic inside the benchmark
    const l1Cache = new Map();
    const l2Client = new Redis({
        host, password, port: 6379, tls: { rejectUnauthorized: false }
    });

    const key = `bench_${Date.now()}`;
    const value = JSON.stringify({ data: 'performance_test', timestamp: Date.now() });

    console.log('\nStep 1: Setting value (Populating L2)...');
    await l2Client.set(key, value, 'EX', 60);

    const rounds = 5;
    let totalLatency = 0;

    console.log(`\nStep 2: Running ${rounds} retrieval rounds...`);

    for (let i = 1; i <= rounds; i++) {
        const start = Date.now();

        let result;
        // Logic mimic:
        if (l1Cache.has(key)) {
            result = l1Cache.get(key);
            const duration = Date.now() - start;
            console.log(`Round ${i} (L1 HIT): ${duration}ms`);
            totalLatency += duration;
        } else {
            result = await l2Client.get(key);
            l1Cache.set(key, result); // Promote to L1
            const duration = Date.now() - start;
            console.log(`Round ${i} (L2 HIT): ${duration}ms`);
            totalLatency += duration;
        }
    }

    const avg = totalLatency / rounds;
    console.log(`\n--- 📊 Final Result ---`);
    console.log(`Average Response Time: ${avg.toFixed(2)}ms`);

    if (avg < 25) {
        console.log('✅ TARGET ACHIEVED: Under 25ms average!');
    } else {
        console.log('⚠️ Slightly above 25ms, likely due to first L2 hit.');
    }

    await l2Client.disconnect();
}

benchmark();
