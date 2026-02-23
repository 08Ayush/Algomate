const fetch = require('node-fetch'); // Assuming node-fetch is available or using built-in fetch in newer node

// Admin User from previous debug output
// ID: 2d1a31bc-969f-4711-9e2f-65237ea3251d
// Role: college_admin
// College ID: c25be3d2-4b6d-4373-b6de-44a4e2a2508f
const user = {
    id: "2d1a31bc-969f-4711-9e2f-65237ea3251d",
    email: "college.admin@svpcet.in",
    role: "college_admin",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: null,
    faculty_type: null
};

// Simulate Client-side token generation
const token = Buffer.from(JSON.stringify(user)).toString('base64');
const API_URL = 'http://localhost:3000/api/admin/courses?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f';

async function testAuth() {
    console.log('Testing Admin Auth...');
    console.log('Target URL:', API_URL);
    console.log('User Payload:', user);
    console.log('Generated Token:', token);

    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        if (!res.ok) {
            const text = await res.text();
            console.log('Error Body:', text);
        } else {
            const data = await res.json();
            console.log('Success! Data items:', data.length);
        }
    } catch (err) {
        console.error('Request failed:', err.message);
    }
}

testAuth();
