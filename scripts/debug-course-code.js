const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function debugCourseCodeMismatch() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const collegeId = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f";
    const courseId = "821d457b-c0a8-4b62-b5f2-e8f4e2a2508f";

    console.log('=== Debugging Course Code Mismatch ===\n');

    // Get the course
    const { data: course } = await db
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

    console.log('1. Course from database:');
    console.log(`   ID: ${course.id}`);
    console.log(`   Title: ${course.title}`);
    console.log(`   Code: "${course.code}"`);

    // Get buckets
    const { data: buckets } = await db
        .from('elective_buckets')
        .select('*')
        .eq('college_id', collegeId)
        .eq('semester', 1);

    console.log('\n2. Buckets for college + semester 1:');
    buckets?.forEach(b => {
        console.log(`   - ${b.bucket_name}:`);
        console.log(`     course field: "${b.course}"`);
        console.log(`     Match? ${b.course === course.code}`);
    });

    // Try exact match
    console.log('\n3. Trying exact match query:');
    const { data: matchedBuckets, error } = await db
        .from('elective_buckets')
        .select('*')
        .eq('college_id', collegeId)
        .eq('course', course.code)
        .eq('semester', 1);

    console.log(`   Found: ${matchedBuckets?.length || 0} buckets`);
    if (error) console.log(`   Error:`, error);
    matchedBuckets?.forEach(b => {
        console.log(`   - ${b.bucket_name}`);
    });
}

debugCourseCodeMismatch();
