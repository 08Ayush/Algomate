const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://ciiukyhjjbbxortzfxsj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU');

async function checkBatches() {
  console.log('=== ALL BATCHES IN DATABASE ===');
  const { data: batches, error } = await supabase
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Found', batches.length, 'batches:');
  batches.forEach(batch => {
    console.log('- ID:', batch.id);
    console.log('  Name:', batch.name);
    console.log('  College ID:', batch.college_id);
    console.log('  Department ID:', batch.department_id);
    console.log('  Course:', batch.course);
    console.log('  Semester:', batch.semester);
    console.log('  Section:', batch.section);
    console.log('  Academic Year:', batch.academic_year);
    console.log('  Created:', batch.created_at);
    console.log('---');
  });
  
  console.log('\n=== ELECTIVE BUCKETS LINKED TO BATCHES ===');
  const { data: buckets } = await supabase
    .from('elective_buckets')
    .select('id, bucket_name, batch_id, batches(name, course, semester)')
    .not('batch_id', 'is', null);
  
  console.log('Buckets with batch links:', buckets);
  
  console.log('\n=== BATCH_SUBJECTS TABLE (Should be empty) ===');
  const { data: batchSubjects } = await supabase
    .from('batch_subjects')
    .select('*');
  
  console.log('Batch subjects count:', batchSubjects?.length || 0);
  console.log('Batch subjects data:', batchSubjects);
  
  console.log('\n=== SUBJECTS WITH COURSE_GROUP_ID (NEP buckets) ===');
  const { data: subjectsInBuckets } = await supabase
    .from('subjects')
    .select('id, code, name, course_group_id')
    .not('course_group_id', 'is', null)
    .limit(10);
  
  console.log('Subjects in NEP buckets:', subjectsInBuckets);
}

checkBatches().catch(console.error);