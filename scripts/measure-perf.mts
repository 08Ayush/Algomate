import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function compare() {
    console.log('🚀 Starting Performance Comparison...\n');

    // 1. Database (Cold)
    const dbStart = Date.now();
    const { data: dbData } = await supabase.from('departments').select('*').limit(5);
    const dbDuration = Date.now() - dbStart;
    console.log(`📡 Database (Direct): ${dbDuration}ms`);

    // 2. Redis Cold Set
    await redis.set('perf_test_key', JSON.stringify(dbData), { ex: 60 });

    // 3. Redis (HIT)
    const redisStart = Date.now();
    const cachedData = await redis.get('perf_test_key');
    const redisDuration = Date.now() - redisStart;
    console.log(`🏎️  Redis (Cached HIT): ${redisDuration}ms`);

    // 4. Comparison
    const improvement = ((dbDuration - redisDuration) / dbDuration * 100).toFixed(1);
    console.log(`\n📊 Improvement: ${improvement}% faster`);

    if (redisDuration > 100) {
        console.log('\n⚠️  WARNING: Your Redis latency is high (>100ms).');
        console.log('This usually means your local machine is geographically far from the Upstash server.');
    }
}

compare();
