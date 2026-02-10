const https = require('https');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/^UPSTASH_REDIS_REST_URL=(.*)$/m);
const tokenMatch = env.match(/^UPSTASH_REDIS_REST_TOKEN=(.*)$/m);

if (!urlMatch || !tokenMatch) {
    console.error('Could not find Redis credentials in .env');
    process.exit(1);
}

let url = urlMatch[1].trim();
let token = tokenMatch[1].trim();

console.log(`Testing Redis connection to: ${url}`);

const hostname = url.replace('https://', '');
const path = '/get/test_key';

const options = {
    hostname: hostname,
    path: path,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const rounds = 5;
let latencies = [];

function measure(i) {
    if (i > rounds) {
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        console.log(`\nAverage Latency: ${avg.toFixed(2)}ms`);
        return;
    }

    const start = Date.now();
    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
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
