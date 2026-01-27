const fetch = require('node-fetch');

// Admin User
const user = {
    id: "2d1a31bc-969f-4711-9e2f-65237ea3251d",
    email: "college.admin@svpcet.in",
    role: "college_admin",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: null
};

const token = Buffer.from(JSON.stringify(user)).toString('base64');

async function testWithRealCourseId() {
    console.log('Testing with actual course ID from database...\n');

    // First, get the course ID
    const courseId = "821d457b-c0a8-4b62-b5f2-e8f4e2a2508f";

    console.log(`Course ID: ${courseId}`);
    console.log(`Semester: 1\n`);

    const res = await fetch(`http://localhost:3000/api/nep/buckets?courseId=${courseId}&semester=1`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    console.log(`Status: ${res.status}`);
    const data = await res.json();

    console.log(`Response:`, JSON.stringify(data, null, 2));
}

testWithRealCourseId();
