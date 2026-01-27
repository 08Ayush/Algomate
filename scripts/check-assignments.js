require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: assignments, error: assignError } = await supabase
        .from('assignments')
        .select('*');

    if (assignError) {
        console.error('Error:', assignError);
        return;
    }

    console.log('Total Assignments:', assignments.length);

    if (assignments.length > 0) {
        const creatorId = assignments[0].created_by;
        console.log('First Assignment Creator ID:', creatorId);
        const { data: user } = await supabase.from('users').select('*').eq('id', creatorId).single();
        console.log('Creator Name:', user ? user.first_name + ' ' + user.last_name : 'Unknown');
        console.log('Creator Email:', user ? user.email : 'Unknown');
        console.log('Assignment Title:', assignments[0].title);
    }
}

check();
