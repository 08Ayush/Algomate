
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

    console.log('--- Checking Constraint Rules Schema ---');
    const { data, error } = await db.from('constraint_rules').select('*').limit(1);

    if (error) {
        console.error('Error fetching constraint_rules:', error);
    } else if (data.length > 0) {
        console.log('Constraint Rules Columns:', Object.keys(data[0]));
    } else {
        console.log('No constraint rules found. Trying insert to get error info...');
        const { error: insertError } = await db.from('constraint_rules').insert({ 'dummy_column': 'value' });
        if (insertError) console.log('Insert Error:', insertError.message);
    }
}

debug().catch(console.error);
