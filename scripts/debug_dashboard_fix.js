
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function debug() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        return;
    }

    const db = createClient(supabaseUrl, supabaseKey);

    console.log('--- Checking Notifications Schema ---');
    // Try to get one row
    const { data: notifData, error: notifError } = await db.from('notifications').select('*').limit(1);
    if (notifError) {
        console.error('Error fetching notifications:', notifError);
    } else if (notifData.length > 0) {
        console.log('Notification Columns:', Object.keys(notifData[0]));
    } else {
        console.log('No notifications found. Trying to insert a dummy to provoke error with column info...');
        const { error: insertError } = await db.from('notifications').insert({ 'dummy_column': 'value' });
        if (insertError) console.log('Insert Error (may reveal info):', insertError.message);
    }

    console.log('\n--- Checking Stats Logic (Service Role) ---');
    // Using a known valid college_id from previous context
    const collegeId = 'c25be3d2-4b6d-4373-b6de-44a4e2a2508f';

    try {
        const counts = await Promise.all([
            db.from('departments').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
            db.from('users').select('*', { count: 'exact', head: true }).eq('college_id', collegeId).eq('role', 'faculty'),
            db.from('classrooms').select('*', { count: 'exact', head: true }).eq('college_id', collegeId)
        ]);

        console.log('Departments Count Result:', counts[0].count, 'Error:', counts[0].error);
        console.log('Faculty Count Result:', counts[1].count, 'Error:', counts[1].error);
        console.log('Classrooms Count Result:', counts[2].count, 'Error:', counts[2].error);

    } catch (e) {
        console.error('Stats Logic Exception:', e);
    }
}

debug().catch(console.error);
