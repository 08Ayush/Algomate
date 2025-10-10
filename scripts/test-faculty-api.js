const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key:', supabaseKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFacultyFetch() {
  console.log('\n========================================');
  console.log('Testing Faculty Data Fetch');
  console.log('========================================\n');

  // 1. Check departments table
  console.log('1. Fetching CSE department...');
  const { data: deptData, error: deptError } = await supabase
    .from('departments')
    .select('id, name, code')
    .eq('code', 'CSE')
    .single();

  if (deptError) {
    console.error('❌ Error fetching department:', deptError);
    return;
  }
  console.log('✅ CSE Department found:', deptData);

  // 2. Check users table for faculty
  console.log('\n2. Fetching all faculty members...');
  const { data: allFaculty, error: allFacultyError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, department_id, is_active')
    .eq('role', 'faculty');

  if (allFacultyError) {
    console.error('❌ Error fetching all faculty:', allFacultyError);
  } else {
    console.log(`✅ Found ${allFaculty.length} total faculty members`);
    if (allFaculty.length > 0) {
      console.log('Sample faculty:', allFaculty[0]);
    }
  }

  // 3. Check faculty in CSE department
  console.log('\n3. Fetching CSE faculty members...');
  const { data: cseFaculty, error: cseFacultyError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      role,
      faculty_type,
      department_id,
      is_active,
      department:departments!users_department_id_fkey(id, name, code)
    `)
    .eq('role', 'faculty')
    .eq('department_id', deptData.id)
    .eq('is_active', true);

  if (cseFacultyError) {
    console.error('❌ Error fetching CSE faculty:', cseFacultyError);
  } else {
    console.log(`✅ Found ${cseFaculty.length} CSE faculty members`);
    if (cseFaculty.length > 0) {
      console.log('\nFirst 3 faculty members:');
      cseFaculty.slice(0, 3).forEach((f, i) => {
        console.log(`${i + 1}. ${f.first_name} ${f.last_name} (${f.email})`);
        console.log(`   Department: ${f.department?.name || 'N/A'}`);
      });
    }
  }

  // 4. Test the exact query used in API
  console.log('\n4. Testing exact API query...');
  let query = supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      college_uid,
      faculty_type,
      department_id,
      max_hours_per_day,
      max_hours_per_week,
      is_active,
      created_at,
      department:departments!users_department_id_fkey(id, name, code)
    `)
    .eq('role', 'faculty')
    .eq('is_active', true)
    .eq('department_id', deptData.id)
    .order('first_name', { ascending: true });

  const { data: apiQueryResult, error: apiQueryError } = await query;

  if (apiQueryError) {
    console.error('❌ Error with API query:', apiQueryError);
  } else {
    console.log(`✅ API query returned ${apiQueryResult.length} faculty members`);
    if (apiQueryResult.length > 0) {
      console.log('\nSample result:', JSON.stringify(apiQueryResult[0], null, 2));
    }
  }

  console.log('\n========================================');
  console.log('Test Complete');
  console.log('========================================\n');
}

testFacultyFetch().catch(console.error);
