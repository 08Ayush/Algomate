
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function createFaculty() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const facultyId = "f9999999-9999-4999-9999-999999999999"; // Distinct ID
    const collegeId = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f";

    // Check if exists
    const { data: existing } = await db.from('users').select('id').eq('id', facultyId).single();
    if (existing) {
        console.log('Test Faculty already exists');
        return;
    }

    console.log('Creating Test Faculty...');
    const { data, error } = await db.from('users').insert({
        id: facultyId,
        email: "test.faculty@svpcet.in",
        first_name: "Test",
        last_name: "Faculty",
        password_hash: "hash",
        college_uid: "FAC001",
        college_id: collegeId,
        role: "faculty",
        faculty_type: "creator",
        is_active: true
    }).select();

    if (error) {
        console.error('Error creating faculty:', error);
    } else {
        console.log('Created faculty:', data);
    }
}

createFaculty();
