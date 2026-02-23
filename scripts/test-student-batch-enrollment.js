const { createClient } = require('@supabase/supabase-js');

// You need to set these environment variables or replace with actual values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStudentBatchEnrollment() {
  console.log('='.repeat(60));
  console.log('Testing Student Batch Enrollment');
  console.log('='.repeat(60));
  
  try {
    // 1. Find a student user
    console.log('\n1. Finding a student user...');
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, current_semester')
      .eq('role', 'student')
      .eq('is_active', true)
      .limit(1);
    
    if (studentError) {
      console.error('❌ Error finding student:', studentError);
      return;
    }
    
    if (!students || students.length === 0) {
      console.log('⚠️  No students found in database');
      return;
    }
    
    const student = students[0];
    console.log('✅ Found student:', student.first_name, student.last_name);
    console.log('   Student ID:', student.id);
    console.log('   Current Semester (from users table):', student.current_semester);
    
    // 2. Check batch enrollment with OLD syntax (implicit FK)
    console.log('\n2. Testing OLD syntax (implicit FK)...');
    const { data: oldData, error: oldError } = await supabase
      .from('student_batch_enrollment')
      .select(`
        batch_id,
        batches (
          id,
          name,
          section,
          semester,
          academic_year
        )
      `)
      .eq('student_id', student.id)
      .eq('is_active', true)
      .single();
    
    if (oldError) {
      console.error('❌ Error with OLD syntax:', oldError.message);
      console.error('   Details:', JSON.stringify(oldError, null, 2));
    } else {
      console.log('✅ OLD syntax works!');
      console.log('   Batch ID:', oldData?.batch_id);
      console.log('   Batch Data:', JSON.stringify(oldData?.batches, null, 2));
    }
    
    // 3. Check batch enrollment with NEW syntax (explicit FK)
    console.log('\n3. Testing NEW syntax (explicit FK with alias)...');
    const { data: newData, error: newError } = await supabase
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
      .eq('student_id', student.id)
      .eq('is_active', true)
      .single();
    
    if (newError) {
      console.error('❌ Error with NEW syntax:', newError.message);
      console.error('   Details:', JSON.stringify(newError, null, 2));
    } else {
      console.log('✅ NEW syntax works!');
      console.log('   Batch ID:', newData?.batch_id);
      console.log('   Batch Data:', JSON.stringify(newData?.batch, null, 2));
    }
    
    // 4. Check if student has any enrollment at all
    console.log('\n4. Checking raw enrollment data...');
    const { data: rawEnrollment, error: rawError } = await supabase
      .from('student_batch_enrollment')
      .select('*')
      .eq('student_id', student.id);
    
    if (rawError) {
      console.error('❌ Error getting raw enrollment:', rawError);
    } else {
      console.log(`✅ Found ${rawEnrollment?.length || 0} enrollment record(s)`);
      if (rawEnrollment && rawEnrollment.length > 0) {
        console.log('   Enrollment details:', JSON.stringify(rawEnrollment, null, 2));
      } else {
        console.log('⚠️  Student has NO batch enrollment records!');
      }
    }
    
    // 5. Check all batches for this student's semester
    if (student.current_semester) {
      console.log('\n5. Checking available batches for semester', student.current_semester, '...');
      const { data: batches, error: batchError } = await supabase
        .from('batches')
        .select('id, name, section, semester, academic_year')
        .eq('semester', student.current_semester)
        .eq('is_active', true);
      
      if (batchError) {
        console.error('❌ Error getting batches:', batchError);
      } else {
        console.log(`✅ Found ${batches?.length || 0} active batch(es) for semester ${student.current_semester}`);
        if (batches && batches.length > 0) {
          batches.forEach(batch => {
            console.log(`   - ${batch.name} ${batch.section} (${batch.academic_year})`);
          });
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Test Complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Check if environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n⚠️  WARNING: Supabase credentials not found in environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('Or edit this file to add them directly\n');
}

testStudentBatchEnrollment();
