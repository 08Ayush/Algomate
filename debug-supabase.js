const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m);
// Use anon key for a simple health check or just connect to the URL root which usually returns 200/404 fast.
// But Supabase root might not respond. We'll use the rest/v1/ suffix or similar.

if (!urlMatch) {
    console.error('Could not find Supabase URL in .env');
    process.exit(1);
}

const url = urlMatch[1].trim();
console.log(`Testing Supabase connection to: ${url}`);

const hostname = url.replace('https://', '').replace(/\/$/, '');
const path = '/rest/v1/'; // Root of REST API

const options = {
    hostname: hostname,
    path: path,
    method: 'GET',
    // No headers needed for just checking connection latency (it will return 401/404 but timing is what matters)
};

const rounds = 5;
let latencies = [];

function measure(i) {
    if (i > rounds) {
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\nAverage Supabase Latency: ${avg.toFixed(2)}ms`);
        return;
    }

    const start = Date.now();
    const req = https.request(options, (res) => {
        res.resume(); // Consume (discard) body
        res.on('end', () => {
            const duration = Date.now() - start;
            console.log(`Round ${i}: ${duration}ms`);
            latencies.push(duration);
            measure(i + 1);
        });
    });

    req.on('error', (e) => {
        console.error(`Round ${i} failed: ${e.message}`);
        measure(i + 1);
    });

    req.end();
}

measure(1);
