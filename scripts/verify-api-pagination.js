/**
 * Verification Script for API Pagination
 * 
 * Usage:
 * 1. Ensure your Next.js server is running (http://localhost:3000)
 * 2. Get a valid Bearer token from your browser (localStorage 'user' -> decode -> or just copy 'Authorization' header)
 * 3. Run: auth_token="<YOUR_TOKEN>" node scripts/verify-api-pagination.js
 */

const fetch = require('node-fetch'); // Ensure node-fetch is installed or use global fetch in Node 18+

const BASE_URL = 'http://localhost:3000';
const TOKEN = process.env.AUTH_TOKEN;

if (!TOKEN) {
    console.error('❌ Error: AUTH_TOKEN environment variable is required.');
    console.log('Usage: set AUTH_TOKEN=ey... && node scripts/verify-api-pagination.js');
    process.exit(1);
}

const endpoints = [
    { name: 'Timetables', url: '/api/timetables?page=1&limit=2' },
    { name: 'Events', url: '/api/events?page=1&limit=2' },
    { name: 'Faculty', url: '/api/faculty?page=1&limit=2' },
    { name: 'Admin Students', url: '/api/admin/students?page=1&limit=2' },
    { name: 'Admin Faculty', url: '/api/admin/faculty?page=1&limit=2' }
];

async function verifyEndpoint(endpoint) {
    try {
        console.log(`\nTesting ${endpoint.name}...`);
        const res = await fetch(`${BASE_URL}${endpoint.url}`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });

        if (!res.ok) {
            console.log(`❌ Failed: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.log('Response:', text.substring(0, 200));
            return;
        }

        const json = await res.json();

        // Check Metadata
        const meta = json.meta;
        let data = json.data || json.students || json.faculty;

        if (!meta) {
            console.log('❌ Missing "meta" object in response.');
            console.log('Keys:', Object.keys(json));
        } else {
            console.log('✅ Meta object found:', meta);

            if (meta.limit === 2 && data.length <= 2) {
                console.log('✅ Pagination Limit verified (requested 2).');
            } else {
                console.log('⚠️ Limit mismatch:', { requested: 2, metaLimit: meta.limit, dataLength: data.length });
            }
        }

    } catch (error) {
        console.error(`❌ Exception checking ${endpoint.name}:`, error.message);
    }
}

async function run() {
    console.log('🚀 Starting Pagination Verification...');
    console.log(`Target: ${BASE_URL}`);

    // Check if fetch is available
    if (typeof fetch === 'undefined') {
        console.error('❌ global fetch not found. Please use Node 18+ or install node-fetch.');
        process.exit(1);
    }

    for (const ep of endpoints) {
        await verifyEndpoint(ep);
    }

    console.log('\n✨ Verification Complete.');
}

run();
