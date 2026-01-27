const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function checkBucketsData() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const collegeId = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f";

    console.log('=== Checking Buckets Data ===\n');

    // Check elective_buckets
    const { data: buckets, error: bucketsError } = await db
        .from('elective_buckets')
        .select('*')
        .limit(5);

    console.log('1. Elective Buckets (first 5):');
    if (bucketsError) {
        console.error('Error:', bucketsError);
    } else {
        console.log(`Found ${buckets?.length || 0} buckets`);
        buckets?.forEach(b => {
            console.log(`  - ${b.bucket_name} (batch_id: ${b.batch_id}, college_id: ${b.college_id}, course: ${b.course}, semester: ${b.semester})`);
        });
    }

    // Check batches
    console.log('\n2. Batches for college:');
    const { data: batches, error: batchesError } = await db
        .from('batches')
        .select('id, name, course_id, semester, is_active')
        .eq('college_id', collegeId)
        .limit(5);

    if (batchesError) {
        console.error('Error:', batchesError);
    } else {
        console.log(`Found ${batches?.length || 0} batches`);
        batches?.forEach(b => {
            console.log(`  - ${b.name} (course_id: ${b.course_id}, semester: ${b.semester}, active: ${b.is_active})`);
        });
    }

    // Check courses
    console.log('\n3. Courses for college:');
    const { data: courses, error: coursesError } = await db
        .from('courses')
        .select('id, title, code')
        .eq('college_id', collegeId);

    if (coursesError) {
        console.error('Error:', coursesError);
    } else {
        console.log(`Found ${courses?.length || 0} courses`);
        courses?.forEach(c => {
            console.log(`  - ${c.title} (${c.code}) - ID: ${c.id}`);
        });
    }
}

checkBucketsData();
