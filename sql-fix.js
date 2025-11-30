// Simple SQL execution to fix the batch
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ciiukyhjjbbxortzfxsj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixWithSQL() {
  console.log('Executing SQL fix...');
  
  // Step 1: Create batch
  const createBatchSQL = `
    INSERT INTO batches (
      id, name, college_id, department_id, semester, academic_year,
      expected_strength, actual_strength, section, is_active
    ) VALUES (
      gen_random_uuid(),
      'B.Ed - Semester 1',
      'afbcc29b-8b1c-40b9-baf7-e5a494aabe02',
      'f95bcc58-1758-4c34-ba97-936175b4ca91',
      1, '2025-26', 30, 25, 'A', true
    ) 
    ON CONFLICT (college_id, department_id, semester, section, academic_year) 
    DO NOTHING
    RETURNING *;
  `;
  
  const { data: batchResult, error: batchError } = await supabase.rpc('exec_sql', {
    sql: createBatchSQL
  });
  
  console.log('Batch creation result:', batchResult, batchError);
  
  // Step 2: Update bucket
  const updateBucketSQL = `
    UPDATE elective_buckets 
    SET batch_id = (
      SELECT id FROM batches 
      WHERE name = 'B.Ed - Semester 1' 
      AND college_id = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02'
      AND semester = 1
      LIMIT 1
    )
    WHERE id = 'fd279320-ca26-417a-a38c-dcbd88e5ef61'
    RETURNING *;
  `;
  
  const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
    sql: updateBucketSQL
  });
  
  console.log('Bucket update result:', updateResult, updateError);
  
  // Step 3: Verify
  const { data: verification } = await supabase
    .from('elective_buckets')
    .select(`
      id, bucket_name, batch_id,
      batches(id, name, semester)
    `)
    .eq('id', 'fd279320-ca26-417a-a38c-dcbd88e5ef61');
    
  console.log('✅ Verification result:', verification);
}

fixWithSQL().catch(console.error);