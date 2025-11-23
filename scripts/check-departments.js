const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDg3ODgsImV4cCI6MjA3NDQ4NDc4OH0.ghVoq26l_vh4cOM9Nkf2hh2AMPRDmNKZPl4zm3NRHpA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDepartments() {
  console.log('🔍 Checking Department IDs');
  console.log('='.repeat(60));
  
  try {
    // 1. Get the logged-in user (Dr. Jayshri Harde)
    console.log('\n1. Checking Dr. Jayshri Harde...');
    const { data: user } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        department_id,
        department:departments!department_id (
          id,
          code,
          name
        )
      `)
      .eq('email', 'jayshri.harde@svpcet.edu.in')
      .single();
    
    if (user) {
      console.log('✅ User:', user.first_name, user.last_name);
      console.log('   Department ID:', user.department_id);
      console.log('   Department:', JSON.stringify(user.department, null, 2));
    }
    
    // 2. List all departments
    console.log('\n2. All Departments in Database:');
    const { data: departments } = await supabase
      .from('departments')
      .select('id, code, name')
      .order('code');
    
    if (departments) {
      departments.forEach((dept, index) => {
        console.log(`\n   ${index + 1}. ${dept.code} - ${dept.name}`);
        console.log(`      ID: ${dept.id}`);
      });
    }
    
    // 3. Check events by department
    console.log('\n3. Events by Department:');
    const { data: events } = await supabase
      .from('events')
      .select(`
        id,
        title,
        status,
        department_id,
        department:departments!department_id (
          code,
          name
        )
      `)
      .eq('status', 'approved')
      .order('start_date', { ascending: false });
    
    if (events) {
      console.log(`   Found ${events.length} approved events\n`);
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.title}`);
        console.log(`      Department: ${event.department?.code} - ${event.department?.name}`);
        console.log(`      Department ID: ${event.department_id}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Check Complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDepartments();
