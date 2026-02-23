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
const API_URL = 'http://localhost:3000/api/admin/courses';

async function testCourses() {
    console.log('Testing Courses API...');
    console.log('URL:', API_URL);

    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log('Body Preview:', text.substring(0, 500));

        if (res.ok) {
            try {
                const json = JSON.parse(text);
                console.log('Data count:', Array.isArray(json) ? json.length : 'Not an array');
            } catch (e) {
                console.log('Response is not JSON');
            }
        }

    } catch (err) {
        console.error('Request failed:', err.message);
    }
}

testCourses();
