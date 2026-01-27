
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function deleteFaculty() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const facultyId = "f9999999-9999-4999-9999-999999999999";

    console.log('Deleting Test Faculty...');
    const { error } = await db.from('users').delete().eq('id', facultyId);

    if (error) {
        console.error('Error deleting faculty:', error);
    } else {
        console.log('Deleted faculty');
    }
}

deleteFaculty();
