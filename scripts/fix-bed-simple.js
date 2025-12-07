// Simple fix script to create B.Ed batch and link existing bucket
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ciiukyhjjbbxortzfxsj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBEdBatch() {
  console.log('Creating B.Ed batch...');
  
  const collegeId = 'afbcc29b-8b1c-40b9-baf7-e5a494aabe02';
  const eduDeptId = 'f95bcc58-1758-4c34-ba97-936175b4ca91'; // Education department
  
  try {
    // First check if batch already exists
    const { data: existingBatch } = await supabase
      .from('batches')
      .select('*')
      .eq('college_id', collegeId)
      .eq('department_id', eduDeptId)
      .eq('semester', 1)
      .eq('name', 'B.Ed - Semester 1')
      .single();
    
    if (existingBatch) {
      console.log('Batch already exists:', existingBatch);
      return existingBatch;
    }
    
    // Create new batch
    const { data: newBatch, error } = await supabase
      .from('batches')
      .insert([{
        name: 'B.Ed - Semester 1',
        college_id: collegeId,
        department_id: eduDeptId,
        semester: 1,
        academic_year: '2025-26',
        expected_strength: 30,
        actual_strength: 25,
        section: 'A',
        is_active: true
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating batch:', error);
      return null;
    }
    
    console.log('Created new batch:', newBatch);
    return newBatch;
    
  } catch (err) {
    console.error('Exception:', err);
    return null;
  }
}

async function linkBucketToBatch() {
  const batch = await createBEdBatch();
  if (!batch) {
    console.error('Failed to create or find batch');
    return;
  }
  
  // Update existing bucket
  const { data: updatedBucket, error } = await supabase
    .from('elective_buckets')
    .update({ batch_id: batch.id })
    .eq('id', 'fd279320-ca26-417a-a38c-dcbd88e5ef61')
    .select()
    .single();
  
  if (error) {
    console.error('Error updating bucket:', error);
    return;
  }
  
  console.log('✅ Updated bucket to link to batch:', updatedBucket);
  console.log('🎉 Fix completed successfully!');
}

linkBucketToBatch().catch(console.error);