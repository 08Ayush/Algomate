const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAPIQueries() {
  console.log('Testing API queries...\n');
  
  // Test colleges with counts
  console.log('1. Colleges with counts:');
  const { data: colleges, error: collegesError } = await supabase
    .from('colleges')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (collegesError) {
    console.log('Error:', collegesError);
  } else {
    console.log(`Found ${colleges.length} colleges`);
    
    // Get counts for first college
    if (colleges.length > 0) {
      const college = colleges[0];
      
      const { count: deptCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college.id);
      
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('college_id', college.id);
      
      console.log(`\nCollege: ${college.name}`);
      console.log(`  Code: ${college.code}`);
      console.log(`  Departments: ${deptCount}`);
      console.log(`  Users: ${userCount}`);
    }
  }
  
  // Test admins
  console.log('\n2. College admins:');
  const { data: admins, error: adminsError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      college_uid,
      phone,
      is_active,
      created_at,
      college:colleges!users_college_id_fkey(
        id,
        name,
        code
      )
    `)
    .eq('role', 'college_admin')
    .order('created_at', { ascending: false });
  
  if (adminsError) {
    console.log('Error:', adminsError);
  } else {
    console.log(`Found ${admins.length} college admins`);
    admins.forEach(admin => {
      console.log(`\n  - ${admin.first_name} ${admin.last_name}`);
      console.log(`    Email: ${admin.email}`);
      console.log(`    College: ${admin.college?.name || 'N/A'}`);
      console.log(`    Active: ${admin.is_active}`);
    });
  }
}

testAPIQueries().catch(console.error);
