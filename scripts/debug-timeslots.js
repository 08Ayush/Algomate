const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function debugTimeSlots() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const timetableId = "d46abce6-10bb-4751-a159-899bca2c8f79";

    console.log('=== Debugging Time Slots ===\n');

    // Get a sample scheduled class
    const { data: sampleClass } = await db
        .from('scheduled_classes')
        .select('*')
        .eq('timetable_id', timetableId)
        .limit(1)
        .single();

    console.log('Sample Scheduled Class:');
    console.log(`  ID: ${sampleClass.id}`);
    console.log(`  Time Slot ID: ${sampleClass.time_slot_id}`);
    console.log(`  Subject ID: ${sampleClass.subject_id}`);

    // Try to fetch the time slot
    if (sampleClass.time_slot_id) {
        const { data: timeSlot, error } = await db
            .from('time_slots')
            .select('*')
            .eq('id', sampleClass.time_slot_id)
            .single();

        console.log('\nTime Slot Lookup:');
        if (error) {
            console.log(`  Error: ${error.message}`);
        } else if (timeSlot) {
            console.log(`  Day: ${timeSlot.day}`);
            console.log(`  Start: ${timeSlot.start_time}`);
            console.log(`  End: ${timeSlot.end_time}`);
        } else {
            console.log(`  Not found`);
        }
    } else {
        console.log('\n  No time_slot_id in scheduled_classes!');
    }
}

debugTimeSlots();
