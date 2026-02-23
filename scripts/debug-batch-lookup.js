const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

async function debugBatchLookup() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const db = createClient(supabaseUrl, supabaseKey);

    const collegeId = "c25be3d2-4b6d-4373-b6de-44a4e2a2508f";
    const courseId = "821d457b-c0a8-4b62-b5f2-e8f4e2a2508f"; // From test output
    const semester = 1;

    console.log('=== Debugging Batch Lookup ===\n');
    console.log(`College ID: ${collegeId}`);
    console.log(`Course ID: ${courseId}`);
    console.log(`Semester: ${semester}\n`);

    // Try to find batch (same logic as API)
    console.log('1. Looking for batch with course_id and semester:');
    const { data: batch, error: batchError } = await db
        .from('batches')
        .select('*')
        .eq('college_id', collegeId)
        .eq('course_id', courseId)
        .eq('semester', semester)
        .eq('is_active', true)
        .maybeSingle();

    if (batchError) {
        console.error('Error:', batchError);
    } else if (batch) {
        console.log('Found batch:', batch.id, '-', batch.name);
    } else {
        console.log('No batch found!');
    }

    // Check all batches for this college
    console.log('\n2. All active batches for this college:');
    const { data: allBatches } = await db
        .from('batches')
        .select('id, name, course_id, semester, is_active')
        .eq('college_id', collegeId)
        .eq('is_active', true);

    console.log(`Found ${allBatches?.length || 0} active batches`);
    allBatches?.forEach(b => {
        console.log(`  - ${b.name}: course_id=${b.course_id}, semester=${b.semester}`);
    });

    // Check elective_buckets structure
    console.log('\n3. Checking elective_buckets structure:');
    const { data: buckets } = await db
        .from('elective_buckets')
        .select('*')
        .limit(3);

    console.log(`Sample buckets:`);
    buckets?.forEach(b => {
        console.log(`  - ${b.bucket_name}:`);
        console.log(`    batch_id: ${b.batch_id}`);
        console.log(`    college_id: ${b.college_id}`);
        console.log(`    course: ${b.course}`);
        console.log(`    semester: ${b.semester}`);
    });

    // Check if buckets use the new NEP 2020 approach (college_id + course + semester)
    console.log('\n4. Looking for buckets with college_id + course + semester (NEP 2020 approach):');
    const { data: nepBuckets } = await db
        .from('elective_buckets')
        .select('*')
        .eq('college_id', collegeId)
        .eq('semester', semester);

    console.log(`Found ${nepBuckets?.length || 0} buckets for college + semester`);
    nepBuckets?.forEach(b => {
        console.log(`  - ${b.bucket_name} (course: ${b.course})`);
    });
}

debugBatchLookup();
