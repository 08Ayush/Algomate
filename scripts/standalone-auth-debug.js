
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

// Mock User
const user = {
    id: "2d1a31bc-969f-4711-9e2f-65237ea3251d",
    email: "college.admin@svpcet.in",
    role: "college_admin",
    college_id: "c25be3d2-4b6d-4373-b6de-44a4e2a2508f",
    department_id: null,
    faculty_type: null
};

const token = Buffer.from(JSON.stringify(user)).toString('base64');
console.log('Testing Token:', token);

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase env vars (Service Role)');
    }

    // Use specific options for service role usually? Defaults are fine for query.
    const db = createClient(supabaseUrl, supabaseKey);

    console.log('Running auth check against DB...');

    // Exact logic from auth.ts
    const { data, error } = await db
        .from('users')
        .select('id, email, role, college_id, department_id, faculty_type')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('DB Error:', error);
    } else {
        console.log('DB Success:', data);
    }
}

run().catch(console.error);
