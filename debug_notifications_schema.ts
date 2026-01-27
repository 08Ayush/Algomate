
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        return;
    }

    const db = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching one notification to check columns...');
    const { data, error } = await db.from('notifications').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('No notifications found. Attempting to insert dummy to see structure or check generic table info if possible via error.');
            // Try invalid select to trigger "column does not exist" hint potentially, or just assume we need to look differently. 
            // Actually, if data is empty, we still don't know columns. 
            // We can try to select a known wrong column to see if Postgres gives a hint of valid columns (rarely reliable in client),
            // or we can select * and hope for at least one row.

            // If empty, let's try to infer from a failed insert
        }
    }
}

checkSchema().catch(console.error);
