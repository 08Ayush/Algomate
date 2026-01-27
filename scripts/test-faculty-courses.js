const fetch = require('node-fetch');

// Faculty User (Creator)
// Creating a mock user based on schema
const facultyUser = {
    id: "f9999999-9999-4999-9999-999999999999",
    email: "test.faculty@svpcet.in",
    role: "faculty",
    faculty_type: "creator",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: "dept-123", // Nullable or needs to match if checked
    first_name: "Test",
    last_name: "Faculty"
};

// Token
const token = Buffer.from(JSON.stringify(facultyUser)).toString('base64');
const API_URL = 'http://localhost:3000/api/admin/courses';

async function testFacultyCourses() {
    console.log('Testing Courses API as Faculty...');
    console.log('Faculty College ID:', facultyUser.college_id);

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
            // API might return array or { courses: [] } - checking usage
            // route.ts returns: NextResponse.json(result.courses) which is an array
            // BUT frontend page.tsx expects: const { courses: data } = await response.json();
            // WAIT! 
            // In Step 2695, I fixed page.tsx to handle array!
            // `if (Array.isArray(data)) setCourses(data) else setCourses(data.courses)`
            // But wait, page.tsx in Step 2829 (Line 120) says:
            // `const { courses: data } = await response.json();`
            // THIS IS DESTRACTURING!
            // If response is `[...]`, then `const { courses } = [...]` means courses is undefined!

            console.log('Response Type:', Array.isArray(data) ? 'Array' : typeof data);
            if (Array.isArray(data)) {
                console.log('Courses found:', data.length);
                console.log('First Course:', data[0]);
            } else {
                console.log('Response Object:', JSON.stringify(data).substring(0, 200));
            }
        } else {
            console.log('Error:', await res.text());
        }

    } catch (err) {
        console.error('Request failed:', err.message);
    }
}

testFacultyCourses();
