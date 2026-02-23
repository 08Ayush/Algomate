const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
// Use service role key for admin operations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwODc4OCwiZXhwIjoyMDc0NDg0Nzg4fQ.hlG84S_fYQ0hc8yctVXibOHLObWLrSZxGnFoOWeLrfg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function enrollStudent() {
  const studentId = 'b22ccefe-f02f-4839-8930-5e78720aee3e';
  
  console.log('🎓 Enrolling student:', studentId);
  console.log('='.repeat(60));
  
  try {
    // 1. Get student info
    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, current_semester, department_id')
      .eq('id', studentId)
      .single();
    
    if (studentError || !student) {
      console.error('❌ Error fetching student:', studentError);
      return;
    }
    
    console.log('\n✅ Student found:');
    console.log('   Name:', student.first_name, student.last_name);
    console.log('   Email:', student.email);
    console.log('   Current Semester:', student.current_semester);
    console.log('   Department ID:', student.department_id);
    
    // 2. Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('student_batch_enrollment')
      .select('id, batch_id')
      .eq('student_id', studentId);
    
    if (existingEnrollment && existingEnrollment.length > 0) {
      console.log('\n⚠️  Student already has enrollment record(s):', existingEnrollment.length);
      console.log('   Existing enrollments:', JSON.stringify(existingEnrollment, null, 2));
      console.log('\n   Do you want to add another enrollment? (Delete existing ones first if needed)');
      return;
    }
    
    // 3. Find a suitable batch for this student's semester
    const { data: batches, error: batchError } = await supabase
      .from('batches')
      .select('id, name, section, semester, academic_year, department_id')
      .eq('semester', student.current_semester || 3)
      .eq('department_id', student.department_id)
      .eq('is_active', true)
      .limit(5);
    
    if (batchError || !batches || batches.length === 0) {
      console.error('\n❌ No batches found for semester', student.current_semester);
      console.log('\nAvailable batches:');
      
      const { data: allBatches } = await supabase
        .from('batches')
        .select('id, name, section, semester, academic_year, department_id')
        .eq('is_active', true);
      
      if (allBatches && allBatches.length > 0) {
        allBatches.forEach(batch => {
          console.log(`   - ${batch.name} ${batch.section} (Sem ${batch.semester}, ${batch.academic_year})`);
        });
      }
      return;
    }
    
    console.log('\n✅ Found', batches.length, 'suitable batch(es):');
    batches.forEach((batch, index) => {
      console.log(`   ${index + 1}. ${batch.name} ${batch.section} (Sem ${batch.semester}, ${batch.academic_year})`);
      console.log(`      Batch ID: ${batch.id}`);
    });
    
    // 4. Enroll in the first available batch
    const selectedBatch = batches[0];
    console.log('\n🎯 Enrolling student in:', selectedBatch.name, selectedBatch.section);
    
    const { data: enrollment, error: enrollError } = await supabase
      .from('student_batch_enrollment')
      .insert({
        student_id: studentId,
        batch_id: selectedBatch.id,
        enrollment_date: new Date().toISOString().split('T')[0],
        is_active: true
      })
      .select()
      .single();
    
    if (enrollError) {
      console.error('\n❌ Error creating enrollment:', enrollError);
      return;
    }
    
    console.log('\n✅ Successfully enrolled!');
    console.log('   Enrollment ID:', enrollment.id);
    console.log('   Batch ID:', enrollment.batch_id);
    console.log('   Enrollment Date:', enrollment.enrollment_date);
    
    // 5. Verify the enrollment
    console.log('\n📋 Verifying enrollment...');
    const { data: verify, error: verifyError } = await supabase
      .from('student_batch_enrollment')
      .select(`
        batch_id,
        batch:batches!batch_id (
          id,
          name,
          section,
          semester,
          academic_year
        )
      `)
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single();
    
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Verification successful!');
      console.log('   Batch Data:', JSON.stringify(verify.batch, null, 2));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Enrollment Complete!');
    console.log('   Refresh the dashboard to see the changes.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

enrollStudent();
