// Fix script to create B.Ed batch and link existing bucket
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ciiukyhjjbbxortzfxsj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBEdBatch() {
  console.log('Creating B.Ed batch and fixing bucket...');
  
  // Get college ID for "Government College of Education, Jammu"
  const collegeId = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02';
  
  // Get Education department ID
  const { data: eduDept } = await supabase
    .from('departments')
    .select('id')
    .eq('college_id', collegeId)
    .eq('code', 'EDU')
    .single();
    
  if (!eduDept) {
    console.error('Education department not found!');
    return;
  }
  
  // Create B.Ed batch for semester 1 using SQL
  let newBatch;
  const { data: batchData, error: batchError } = await supabase
    .rpc('exec_sql', {
      query: `
        INSERT INTO batches (
          name, college_id, department_id, semester, academic_year, 
          expected_strength, actual_strength, section, is_active
        ) VALUES (
          'B.Ed - Semester 1', 
          '${collegeId}', 
          '${eduDept.id}', 
          1, 
          '2025-26', 
          30, 
          25, 
          'A', 
          true
        ) RETURNING *;
      `
    });
    
  if (batchError) {
    console.error('Error creating batch via RPC:', batchError);
    console.log('Trying direct insert...');
    
    // Fallback to direct insert
    const { data: batchResult, error: directError } = await supabase
      .from('batches')
      .insert([{
        name: 'B.Ed - Semester 1',
        college_id: collegeId,
        department_id: eduDept.id,
        semester: 1,
        academic_year: '2025-26',
        expected_strength: 30,
        actual_strength: 25,
        section: 'A',
        is_active: true
      }])
      .select();
      
    if (directError) {
      console.error('Direct insert error:', directError);
      return;
    }
    
    newBatch = batchResult[0];
  } else {
    newBatch = batchData;
  }
    
  if (batchError) {
    console.error('Error creating batch:', batchError);
    return;
  }
  
  console.log('Created batch:', newBatch);
  
  // Update existing bucket to link to this batch
  const { data: updatedBucket, error: updateError } = await supabase
    .from('elective_buckets')
    .update({ batch_id: newBatch.id })
    .eq('id', 'fd279320-ca26-417a-a38c-dcbd88e5ef61')
    .select()
    .single();
    
  if (updateError) {
    console.error('Error updating bucket:', updateError);
    return;
  }
  
  console.log('Updated bucket:', updatedBucket);
  console.log('✅ Fix completed successfully!');
}

fixBEdBatch().catch(console.error);