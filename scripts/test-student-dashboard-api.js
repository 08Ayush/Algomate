const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDashboardAPI() {
  console.log('Testing Student Dashboard API...\n');
  
  try {
    // First, find a student user
    console.log('1. Finding a student user...');
    const { data: students, error: studentError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role, department_id')
      .eq('role', 'student')
      .eq('is_active', true)
      .limit(1);
    
    if (studentError) {
      console.error('Error finding student:', studentError);
      return;
    }
    
    if (!students || students.length === 0) {
      console.log('No active students found in database');
      return;
    }
    
    const student = students[0];
    console.log('Found student:', student.first_name, student.last_name);
    console.log('Student ID:', student.id);
    console.log('Department ID:', student.department_id);
    
    // Test user fetch
    console.log('\n2. Testing user data fetch...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        faculty_type,
        current_semester,
        department_id,
        college_id,
        departments (
          id,
          name,
          code
        ),
        colleges (
          id,
          name
        )
      `)
      .eq('id', student.id)
      .single();
    
    if (userError) {
      console.error('Error fetching user data:', userError);
    } else {
      console.log('✓ User data fetched successfully');
      console.log('  Department:', userData.departments?.name);
      console.log('  College:', userData.colleges?.name);
      console.log('  Semester:', userData.current_semester);
    }
    
    // Test batch enrollment
    console.log('\n3. Testing batch enrollment fetch...');
    const { data: enrollmentData, error: enrollmentError } = await supabase
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
    
    if (enrollmentError) {
      console.error('Error fetching enrollment:', enrollmentError);
    } else if (enrollmentData) {
      console.log('✓ Batch enrollment fetched successfully');
      console.log('  Batch:', enrollmentData.batches?.name);
      console.log('  Section:', enrollmentData.batches?.section);
      console.log('  Semester:', enrollmentData.batches?.semester);
    } else {
      console.log('⚠ No batch enrollment found for this student');
    }
    
    // Test events fetch
    console.log('\n4. Testing events fetch...');
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_type,
        start_date,
        end_date,
        start_time,
        end_time,
        venue,
        status,
        created_by,
        creator:users!created_by (
          first_name,
          last_name,
          faculty_type
        )
      `)
      .eq('department_id', student.department_id)
      .eq('status', 'approved')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true })
      .limit(5);
    
    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      console.log('Error details:', JSON.stringify(eventsError, null, 2));
    } else {
      console.log(`✓ Events fetched successfully (${eventsData?.length || 0} events)`);
      if (eventsData && eventsData.length > 0) {
        eventsData.forEach((event, idx) => {
          console.log(`  ${idx + 1}. ${event.title}`);
          console.log(`     Date: ${event.start_date}`);
          console.log(`     Venue: ${event.venue}`);
          console.log(`     Status: ${event.status}`);
          console.log(`     Creator: ${event.creator?.first_name} ${event.creator?.last_name}`);
        });
      } else {
        console.log('  No approved events found for this department');
      }
    }
    
    // Test faculty count
    console.log('\n5. Testing faculty count...');
    const { count: facultyCount, error: facultyError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('department_id', student.department_id)
      .eq('role', 'faculty')
      .eq('is_active', true);
    
    if (facultyError) {
      console.error('Error fetching faculty count:', facultyError);
    } else {
      console.log(`✓ Faculty count: ${facultyCount || 0}`);
    }
    
    console.log('\n✅ Dashboard API test completed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testDashboardAPI();
