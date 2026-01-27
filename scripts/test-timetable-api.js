const fetch = require('node-fetch');

// Faculty User
const user = {
    id: "2d1a31bc-969f-4711-9e2f-65237ea3251d",
    email: "college.admin@svpcet.in",
    role: "college_admin",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: null
};

const token = Buffer.from(JSON.stringify(user)).toString('base64');
const timetableId = "d46abce6-10bb-4751-a159-899bca2c8f79";

async function testTimetableAPI() {
    console.log('Testing Timetable API...\n');
    console.log(`Timetable ID: ${timetableId}\n`);

    try {
        const res = await fetch(`http://localhost:3000/api/timetables/${timetableId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`Status: ${res.status}`);

        if (res.ok) {
            const data = await res.json();
            console.log('\nResponse:');
            console.log(`  Success: ${data.success}`);
            console.log(`  Timetable:`, data.timetable ? 'Present' : 'Missing');
            if (data.timetable) {
                console.log(`    - Title: ${data.timetable.title}`);
                console.log(`    - Batch Name: ${data.timetable.batch_name || 'N/A'}`);
                console.log(`    - Status: ${data.timetable.status}`);
            }
            console.log(`  Scheduled Classes: ${data.scheduledClasses?.length || 0}`);
            if (data.scheduledClasses && data.scheduledClasses.length > 0) {
                console.log(`    First class:`, data.scheduledClasses[0]);
            }
        } else {
            console.log('Error:', await res.text());
        }
    } catch (err) {
        console.error('Request failed:', err.message);
    }
}

testTimetableAPI();
