const https = require('https');
const fs = require('fs');
const Redis = require('ioredis');

async function analyzeLatencyPerformance() {
    console.log('--- 🛡️  Caching vs Database Analysis ---');

    // 1. Setup credentials
    const env = fs.readFileSync('.env', 'utf8');
    const redisUrl = env.match(/^UPSTASH_REDIS_REST_URL=https:\/\/(.*)$/m)?.[1].trim();
    const redisToken = env.match(/^UPSTASH_REDIS_REST_TOKEN=(.*)$/m)?.[1].trim();
    const supabaseUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1].trim();

    if (!redisUrl || !redisToken || !supabaseUrl) {
        console.error('Missing credentials');
        return;
    }

    // 2. Setup Redis (TCP)
    const redis = new Redis({
        host: redisUrl, password: redisToken, port: 6379, tls: { rejectUnauthorized: false }
    });

    const key = `analysis_key_${Date.now()}`;
    const testData = JSON.stringify({ sample: "test_value_for_performance_benchmark" });

    console.log('\n📊 STARTING COMPARISON TEST');

    // TEST 1: RAW DATABASE LATENCY (Simulated via HTTPS to Supabase edge)
    const dbLatencies = [];
    for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await new Promise((resolve) => {
            https.get(`${supabaseUrl}/rest/v1/`, (res) => {
                res.on('data', () => { });
                res.on('end', resolve);
            }).on('error', resolve);
        });
        dbLatencies.push(Date.now() - start);
    }
    const avgDb = dbLatencies.reduce((a, b) => a + b, 0) / dbLatencies.length;
    console.log(`\n1. Supabase Reachability Latency: ${avgDb.toFixed(2)}ms (This is our DB baseline)`);

    // TEST 2: COLD CACHE (Miss + Set)
    const coldStart = Date.now();
    await redis.get(key); // Miss
    const missTime = Date.now() - coldStart;

    const setStart = Date.now();
    await redis.set(key, testData, 'EX', 60); // Set
    const setTime = Date.now() - setStart;

    console.log(`2. Cold Cache Overhead (Miss + Populate): ${missTime + setTime}ms`);
    console.log(`   - Lookup Miss: ${missTime}ms`);
    console.log(`   - Storage Set: ${setTime}ms`);

    // TEST 3: WARM CACHE (Hit)
    const warmLatencies = [];
    for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await redis.get(key);
        warmLatencies.push(Date.now() - start);
    }
    const avgWarm = warmLatencies.reduce((a, b) => a + b, 0) / warmLatencies.length;
    console.log(`3. Warm Cache Retrieval (L2): ${avgWarm.toFixed(2)}ms`);

    console.log('\n--- 🧠 ANALYSIS ---');
    console.log(`Total Miss Penalty: +${missTime.toFixed(0)}ms added to the first DB query.`);
    console.log(`Total Hit Benefit:  -${(avgDb - avgWarm).toFixed(0)}ms saved on every query after.`);

    if (avgWarm > avgDb) {
        console.log('\n🚨 ALERT: Cache hit is SLOWER than Database!');
        console.log('REASON: Your Redis server is geographically further than the Supabase edge.');
    } else {
        console.log('\n✅ Caching is mathematically beneficial for high-traffic.');
    }

    await redis.disconnect();
}

analyzeLatencyPerformance();
