/**
 * Login API Test Script
 * Run with: node test-login.js
 */

const API_BASE = 'http://localhost:3000';

async function testLogin() {
    console.log('🧪 Testing Login Functionality...\n');

    // Test 1: Missing credentials
    console.log('Test 1: Missing credentials');
    try {
        const res1 = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data1 = await res1.json();
        console.log(`   Status: ${res1.status}`);
        console.log(`   Response:`, data1);
        console.log(res1.status === 400 || res1.status === 500 ? '   ✅ PASS: Returns error\n' : '   ❌ FAIL\n');
    } catch (err) {
        console.log('   ❌ ERROR:', err.message, '\n');
    }

    // Test 2: Invalid credentials
    console.log('Test 2: Invalid credentials');
    try {
        const res2 = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                collegeUid: 'INVALID_USER',
                password: 'wrongpassword'
            })
        });
        const data2 = await res2.json();
        console.log(`   Status: ${res2.status}`);
        console.log(`   Response:`, data2);
        console.log(res2.status === 401 ? '   ✅ PASS: Returns unauthorized\n' : '   ❌ FAIL\n');
    } catch (err) {
        console.log('   ❌ ERROR:', err.message, '\n');
    }

    // Test 3: Valid credentials (YOU NEED TO REPLACE WITH REAL USER)
    console.log('Test 3: Valid credentials (replace with real user data)');
    console.log('   ⚠️  MANUAL TEST REQUIRED');
    console.log('   Replace collegeUid and password below with actual test user\n');

    const TEST_USER = {
        collegeUid: 'YOUR_TEST_UID',  // Replace with real UID
        password: 'YOUR_TEST_PASSWORD'  // Replace with real password
    };

    try {
        const res3 = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_USER)
        });
        const data3 = await res3.json();
        console.log(`   Status: ${res3.status}`);
        console.log(`   Response:`, data3);

        if (res3.status === 200 && data3.token && data3.userData) {
            console.log('   ✅ PASS: Login successful with token\n');
        } else if (res3.status === 401) {
            console.log('   ⚠️  Expected (no real test user provided)\n');
        } else {
            console.log('   ❌ FAIL: Unexpected response\n');
        }
    } catch (err) {
        console.log('   ❌ ERROR:', err.message, '\n');
    }

    console.log('🏁 Test Complete\n');
}

// Run tests
testLogin().catch(console.error);
