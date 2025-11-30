// Simple test script to check the current state of elective_buckets table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ciiukyhjjbbxortzfxsj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBuckets() {
  console.log('Checking current elective_buckets table...');
  
  // Check buckets
  const { data: buckets, error: bucketsError } = await supabase
    .from('elective_buckets')
    .select('*');
    
  console.log('Buckets:', JSON.stringify(buckets, null, 2));
  if (bucketsError) console.error('Buckets Error:', bucketsError);
  
  // Check batches
  const { data: batches, error: batchesError } = await supabase
    .from('batches')
    .select('*');
    
  console.log('\nBatches:', JSON.stringify(batches, null, 2));
  if (batchesError) console.error('Batches Error:', batchesError);
  
  // Check subjects with course_group_id
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, code, name, course_group_id')
    .not('course_group_id', 'is', null);
    
  console.log('\nSubjects in buckets:', JSON.stringify(subjects, null, 2));
  if (subjectsError) console.error('Subjects Error:', subjectsError);
  
  // Check colleges
  const { data: colleges, error: collegesError } = await supabase
    .from('colleges')
    .select('id, name');
    
  console.log('\nColleges:', JSON.stringify(colleges, null, 2));
  if (collegesError) console.error('Colleges Error:', collegesError);
  
  // Check departments
  const { data: departments, error: deptError } = await supabase
    .from('departments')
    .select('*');
    
  console.log('\nDepartments:', JSON.stringify(departments, null, 2));
  if (deptError) console.error('Departments Error:', deptError);
}

testBuckets().catch(console.error);