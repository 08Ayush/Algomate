const fetch = require('node-fetch');

// Faculty User (using the real test user we created earlier)
const facultyUser = {
    id: "2d1a31bc-969f-4711-9e2f-65237ea3251d", // Using admin for now
    email: "college.admin@svpcet.in",
    role: "college_admin",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: null
};

// Token
const token = Buffer.from(JSON.stringify(facultyUser)).toString('base64');

// Test with different parameter combinations
async function testBuckets() {
    console.log('Testing Buckets API...\n');

    // Test 1: No parameters
    console.log('Test 1: No parameters');
    await testBucketsWithParams('');

    // Test 2: With courseId only
    console.log('\nTest 2: With courseId');
    await testBucketsWithParams('?courseId=821d457b-c0a8-4b62-b5f2-e8f4e2a2508f');

    // Test 3: With semester only
    console.log('\nTest 3: With semester=1');
    await testBucketsWithParams('?semester=1');

    // Test 4: With both courseId and semester
    console.log('\nTest 4: With courseId and semester');
    await testBucketsWithParams('?courseId=821d457b-c0a8-4b62-b5f2-e8f4e2a2508f&semester=1');
}

async function testBucketsWithParams(params) {
    try {
        const res = await fetch(`http://localhost:3000/api/nep/buckets${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`  Status: ${res.status}`);

        if (res.ok) {
            const data = await res.json();
            console.log(`  Buckets found: ${Array.isArray(data) ? data.length : 'N/A'}`);
            if (Array.isArray(data) && data.length > 0) {
                console.log(`  First bucket:`, data[0].bucket_name);
            }
        } else {
            console.log(`  Error:`, await res.text());
        }
    } catch (err) {
        console.error(`  Request failed:`, err.message);
    }
}

testBuckets();
