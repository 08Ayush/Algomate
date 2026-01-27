const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function checkTimetableData() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const timetableId = "d46abce6-10bb-4751-a159-899bca2c8f79";

    console.log('=== Checking Timetable Data ===\n');
    console.log(`Timetable ID: ${timetableId}\n`);

    // Check generated_timetables
    const { data: timetable, error: ttError } = await db
        .from('generated_timetables')
        .select('*')
        .eq('id', timetableId)
        .single();

    if (ttError) {
        console.error('Error fetching timetable:', ttError);
        return;
    }

    console.log('1. Timetable Record:');
    console.log(`   Title: ${timetable.title}`);
    console.log(`   Batch ID: ${timetable.batch_id}`);
    console.log(`   Status: ${timetable.status}`);
    console.log(`   Academic Year: ${timetable.academic_year}`);
    console.log(`   Semester: ${timetable.semester}`);

    // Check batch
    if (timetable.batch_id) {
        const { data: batch } = await db
            .from('batches')
            .select('*')
            .eq('id', timetable.batch_id)
            .single();

        console.log('\n2. Batch Info:');
        console.log(`   Name: ${batch?.name || 'Not found'}`);
        console.log(`   Course ID: ${batch?.course_id}`);
        console.log(`   Department ID: ${batch?.department_id}`);
    }

    // Check scheduled_classes
    const { data: classes, error: classError } = await db
        .from('scheduled_classes')
        .select('*')
        .eq('timetable_id', timetableId)
        .limit(5);

    console.log('\n3. Scheduled Classes:');
    console.log(`   Found: ${classes?.length || 0} classes`);
    if (classError) console.error('   Error:', classError);

    classes?.forEach((c, i) => {
        console.log(`   Class ${i + 1}:`);
        console.log(`     Subject ID: ${c.subject_id}`);
        console.log(`     Faculty ID: ${c.faculty_id}`);
        console.log(`     Classroom ID: ${c.classroom_id}`);
        console.log(`     Time Slot ID: ${c.time_slot_id}`);
    });
}

checkTimetableData();
