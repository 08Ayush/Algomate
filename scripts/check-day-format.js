const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function checkDayOfWeekFormat() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const timetableId = "d46abce6-10bb-4751-a159-899bca2c8f79";

    console.log('=== Checking day_of_week format ===\n');

    const { data: classes } = await db
        .from('scheduled_classes')
        .select('id, day_of_week, start_time, end_time')
        .eq('timetable_id', timetableId)
        .limit(5);

    console.log('Sample classes:');
    classes?.forEach(c => {
        console.log(`  day_of_week: ${c.day_of_week} (type: ${typeof c.day_of_week})`);
        console.log(`  time: ${c.start_time} - ${c.end_time}`);
        console.log('');
    });
}

checkDayOfWeekFormat();
