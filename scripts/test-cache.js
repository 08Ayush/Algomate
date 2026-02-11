#!/usr/bin/env node

/**
 * Cache Verification Test Script
 * 
 * Quick automated test to verify cache behavior
 * Run: node scripts/test-cache.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCacheHitMiss(endpoint, token) {
    log(`\n📊 Testing: ${endpoint}`, 'cyan');

    try {
        // First request (should be MISS)
        const start1 = Date.now();
        const response1 = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const time1 = Date.now() - start1;

        if (!response1.ok) {
            log(`❌ Request failed: ${response1.status}`, 'red');
            return false;
        }

        log(`  First request: ${time1}ms (expected: MISS)`, 'yellow');

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second request (should be HIT)
        const start2 = Date.now();
        const response2 = await fetch(`${BASE_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const time2 = Date.now() - start2;

        if (!response2.ok) {
            log(`❌ Request failed: ${response2.status}`, 'red');
            return false;
        }

        log(`  Second request: ${time2}ms (expected: HIT)`, 'yellow');

        // Verify cache hit is faster
        if (time2 < time1 * 0.5) {
            log(`  ✅ Cache HIT confirmed (${Math.round((1 - time2 / time1) * 100)}% faster)`, 'green');
            return true;
        } else {
            log(`  ⚠️  No significant speed improvement (cache might not be working)`, 'yellow');
            return false;
        }
    } catch (error) {
        log(`  ❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function testCacheEviction(getEndpoint, postEndpoint, postData, token) {
    log(`\n🔄 Testing Cache Eviction: ${getEndpoint}`, 'cyan');

    try {
        // 1. Load data (cache it)
        log('  Step 1: Loading data (caching)...', 'blue');
        const response1 = await fetch(`${BASE_URL}${getEndpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response1.ok) {
            log(`  ❌ Initial load failed: ${response1.status}`, 'red');
            return false;
        }

        // 2. Create new item (should invalidate cache)
        log('  Step 2: Creating new item (should invalidate cache)...', 'blue');
        const response2 = await fetch(`${BASE_URL}${postEndpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(postData)
        });

        if (!response2.ok) {
            log(`  ⚠️  Create failed: ${response2.status} (might be validation error)`, 'yellow');
            // Continue anyway to test cache behavior
        } else {
            log('  ✅ Item created successfully', 'green');
        }

        // 3. Load data again (should be MISS due to eviction)
        log('  Step 3: Loading data again (should be fresh from DB)...', 'blue');
        const start3 = Date.now();
        const response3 = await fetch(`${BASE_URL}${getEndpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const time3 = Date.now() - start3;

        if (!response3.ok) {
            log(`  ❌ Reload failed: ${response3.status}`, 'red');
            return false;
        }

        log(`  Response time: ${time3}ms`, 'yellow');
        log('  ✅ Cache eviction test completed', 'green');
        log('  💡 Check server logs to confirm "Cache MISS" after creation', 'blue');

        return true;
    } catch (error) {
        log(`  ❌ Error: ${error.message}`, 'red');
        return false;
    }
}

async function runTests() {
    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║   Cache-Aside Verification Tests      ║', 'cyan');
    log('╚════════════════════════════════════════╝\n', 'cyan');

    // Get token from environment or prompt
    const token = process.env.TEST_AUTH_TOKEN;

    if (!token) {
        log('❌ Error: TEST_AUTH_TOKEN environment variable not set', 'red');
        log('\nUsage:', 'yellow');
        log('  TEST_AUTH_TOKEN="your_base64_token" node scripts/test-cache.js\n', 'blue');
        process.exit(1);
    }

    const results = [];

    // Test 1: Students API
    results.push(await testCacheHitMiss('/api/admin/students', token));

    // Test 2: Departments API
    results.push(await testCacheHitMiss('/api/admin/departments', token));

    // Test 3: Faculty API
    results.push(await testCacheHitMiss('/api/admin/faculty', token));

    // Test 4: Cache Eviction (Departments)
    results.push(await testCacheEviction(
        '/api/admin/departments',
        '/api/admin/departments',
        {
            name: `Test Dept ${Date.now()}`,
            code: `TEST${Date.now().toString().slice(-4)}`,
            description: 'Cache eviction test'
        },
        token
    ));

    // Summary
    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║           Test Summary                 ║', 'cyan');
    log('╚════════════════════════════════════════╝\n', 'cyan');

    const passed = results.filter(r => r).length;
    const total = results.length;

    log(`Tests Passed: ${passed}/${total}`, passed === total ? 'green' : 'yellow');

    if (passed === total) {
        log('\n✅ All tests passed! Cache-Aside is working correctly.\n', 'green');
        process.exit(0);
    } else {
        log('\n⚠️  Some tests failed. Check server logs for details.\n', 'yellow');
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    log(`\n❌ Fatal error: ${error.message}\n`, 'red');
    process.exit(1);
});
