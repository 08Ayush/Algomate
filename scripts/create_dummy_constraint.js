
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function createDummyConstraint() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars');
        return;
    }

    const db = createClient(supabaseUrl, supabaseKey);

    console.log('Creating dummy constraint...');
    const { data, error } = await db.from('constraint_rules').insert({
        rule_type: 'HARD',
        description: 'Test Constraint',
        weight: 10,
        is_active: true,
        created_by: '2d1a31bc-969f-4711-9e2f-65237ea3251d' // Admin ID
    }).select();

    if (error) {
        console.error('Error creating constraint:', error);
    } else {
        console.log('Created constraint:', data);
    }
}

createDummyConstraint();
