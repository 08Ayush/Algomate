// Check current bucket structure after fix
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ciiukyhjjbbxortzfxsj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU'
);

async function checkBucketAfterFix() {
  console.log('=== CURRENT BUCKET WITH BATCH INFO ===');
  const { data: bucketWithBatch, error } = await supabase
    .from('elective_buckets')
    .select(`
      *,
      batches (
        id, name, semester, college_id, academic_year,
        colleges (name)
      )
    `)
    .eq('id', 'fd279320-ca26-417a-a38c-dcbd88e5ef61')
    .single();
    
  if (error) {
    console.error('Bucket error:', error);
  } else {
    console.log(JSON.stringify(bucketWithBatch, null, 2));
  }
  
  console.log('\n=== SUBJECTS IN THIS BUCKET ===');
  const { data: subjects, error: subError } = await supabase
    .from('subjects')
    .select('id, code, name, course_group_id')
    .eq('course_group_id', 'fd279320-ca26-417a-a38c-dcbd88e5ef61');
    
  if (subError) {
    console.error('Subjects error:', subError);
  } else {
    console.log(JSON.stringify(subjects, null, 2));
    console.log(`\n✅ Found ${subjects.length} subjects in bucket`);
  }
  
  console.log('\n=== TESTING API DESIGN ===');
  console.log('The bucket should have:');
  console.log('- bucket_name: "Sem 1 major pool"');
  console.log('- batch_id: (UUID)');
  console.log('- NO college_id, course, semester fields (those come from batch)');
  console.log('- Batch info available through JOIN');
  
  if (bucketWithBatch && bucketWithBatch.batches) {
    console.log(`\n✅ Batch connection working:`);
    console.log(`- Batch: ${bucketWithBatch.batches.name}`);
    console.log(`- Semester: ${bucketWithBatch.batches.semester}`);
    console.log(`- College: ${bucketWithBatch.batches.colleges?.name}`);
  }
}

checkBucketAfterFix().catch(console.error);