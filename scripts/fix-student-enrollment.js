const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const supabase = createClient('https://ciiukyhjjbbxortzfxsj.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpaXVreWhqamJieG9ydHpmeHNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzg3NDIxOCwiZXhwIjoyMDc5NDUwMjE4fQ.YtA2LQ0NHirYnmhXZD0zNKvAR45P0Bc0hSIIk1jWUVU');

async function fixStudentEnrollment() {
  console.log('=== FIXING STUDENT ENROLLMENT ISSUE ===');
  
  // Get the Government College of Education
  const { data: college } = await supabase
    .from('colleges')
    .select('*')
    .eq('name', 'Government College of Education, Jammu')
    .single();
  
  console.log('College:', college);
  
  if (!college) {
    console.log('College not found!');
    return;
  }
  
  // Get the student
  const { data: student } = await supabase
    .from('users')
    .select('*')
    .eq('college_id', college.id)
    .eq('role', 'student')
    .single();
  
  console.log('Student found:', student);
  
  if (!student) {
    console.log('No student found!');
    return;
  }
  
  // Check if B.Ed batch exists for this college
  let { data: bedBatch } = await supabase
    .from('batches')
    .select('*')
    .eq('college_id', college.id)
    .eq('department_id', student.department_id)
    .eq('semester', 1)
    .single();
  
  console.log('Existing B.Ed batch:', bedBatch);
  
  if (!bedBatch) {
    console.log('Creating B.Ed batch for Government College of Education...');
    
    const { data: newBatch, error: batchError } = await supabase
      .from('batches')
      .insert({
        name: 'B.Ed - Semester 1',
        college_id: college.id,
        department_id: student.department_id,
        semester: 1,
        section: 'A',
        academic_year: '2025-26',
        expected_strength: 30,
        actual_strength: 0,
        is_active: true
      })
      .select('*')
      .single();
    
    if (batchError) {
      console.error('Error creating batch:', batchError);
      return;
    }
    
    bedBatch = newBatch;
    console.log('✅ Created B.Ed batch:', bedBatch);
  }
  
  // Check if student is enrolled in batch
  const { data: enrollment } = await supabase
    .from('student_batch_enrollment')
    .select('*')
    .eq('student_id', student.id)
    .eq('batch_id', bedBatch.id)
    .single();
  
  if (!enrollment) {
    console.log('Enrolling student in batch...');
    
    const { data: newEnrollment, error: enrollmentError } = await supabase
      .from('student_batch_enrollment')
      .insert({
        id: crypto.randomUUID(),
        student_id: student.id,
        batch_id: bedBatch.id,
        enrollment_date: new Date().toISOString().split('T')[0],
        is_active: true
      })
      .select('*')
      .single();
    
    if (enrollmentError) {
      console.error('Error enrolling student:', enrollmentError);
      return;
    }
    
    console.log('✅ Enrolled student in batch:', newEnrollment);
    
    // Update batch actual strength
    await supabase
      .from('batches')
      .update({ actual_strength: 1 })
      .eq('id', bedBatch.id);
  } else {
    console.log('Student already enrolled in batch');
  }
  
  // Create elective bucket for this batch if it doesn't exist
  const { data: existingBucket } = await supabase
    .from('elective_buckets')
    .select('*')
    .eq('batch_id', bedBatch.id)
    .single();
  
  if (!existingBucket) {
    console.log('Creating elective bucket for B.Ed batch...');
    
    const { data: newBucket, error: bucketError } = await supabase
      .from('elective_buckets')
      .insert({
        bucket_name: 'B.Ed Semester 1 - Major Subjects Pool',
        description: 'Choose your major subjects for B.Ed Semester 1',
        max_selections: 2,
        min_selections: 1,
        batch_id: bedBatch.id
      })
      .select('*')
      .single();
    
    if (bucketError) {
      console.error('Error creating bucket:', bucketError);
      return;
    }
    
    console.log('✅ Created elective bucket:', newBucket);
    
    // Move existing subjects to this new bucket
    const { data: existingSubjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('course_group_id', 'd5e13350-5bac-489a-9847-3c4b4f0b8a64');
    
    if (existingSubjects && existingSubjects.length > 0) {
      console.log('Moving existing subjects to new bucket...');
      
      await supabase
        .from('subjects')
        .update({ course_group_id: newBucket.id })
        .eq('course_group_id', 'd5e13350-5bac-489a-9847-3c4b4f0b8a64');
      
      console.log('✅ Moved subjects to new bucket');
    }
  } else {
    console.log('Elective bucket already exists for this batch');
  }
  
  console.log('\n=== FINAL VERIFICATION ===');
  const { data: finalCheck } = await supabase
    .from('student_batch_enrollment')
    .select(`
      *,
      batches (
        id,
        name,
        semester,
        elective_buckets (
          id,
          bucket_name,
          max_selections,
          subjects:subjects(count)
        )
      )
    `)
    .eq('student_id', student.id)
    .single();
  
  console.log('Final enrollment check:', JSON.stringify(finalCheck, null, 2));
  
  console.log('\n✅ STUDENT ENROLLMENT FIXED!');
  console.log('Student can now see and select from elective buckets.');
}

fixStudentEnrollment().catch(console.error);