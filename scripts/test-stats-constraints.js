const fetch = require('node-fetch');

// Admin User
const user = {
    id: "2d1a31bc-969f-4711-9e2f-65237ea3251d",
    email: "college.admin@svpcet.in",
    role: "college_admin",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: null,
    faculty_type: null
};

// Token
const token = Buffer.from(JSON.stringify(user)).toString('base64');
const API_URL = 'http://localhost:3000/api/admin/stats?college_id=c25be3d2-4b6d-4373-b6de-44a4e2a2508f';

async function testStats() {
    console.log('Testing Stats API for Constraints...');
    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const data = await res.json();
            console.log('Stats:', JSON.stringify(data, null, 2));
            if (data.constraints > 0) {
                console.log('SUCCESS: Constraints count is visible:', data.constraints);
            } else {
                console.log('WARNING: Constraints count is 0');
            }
        } else {
            console.log('Error Body:', await res.text());
        }

    } catch (err) {
        console.error('Request failed:', err.message);
    }
}

testStats();
