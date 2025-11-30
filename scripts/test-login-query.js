const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLoginQuery() {
  console.log('Testing login query...');
  
  // Test with super_admin
  console.log('\n1. Testing super_admin (ADM000001):');
  const { data: superAdmin, error: superAdminError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      college_uid,
      role,
      department_id,
      is_active,
      departments!users_department_id_fkey(id, name, code)
    `)
    .eq('college_uid', 'ADM000001')
    .eq('is_active', true)
    .maybeSingle();
  
  console.log('Super Admin Data:', JSON.stringify(superAdmin, null, 2));
  console.log('Super Admin Error:', superAdminError);
  
  // Test with regular user
  console.log('\n2. Testing regular user - listing first 3 active users:');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      college_uid,
      role,
      department_id,
      is_active,
      departments!users_department_id_fkey(id, name, code)
    `)
    .eq('is_active', true)
    .limit(3);
  
  console.log('Users:', JSON.stringify(users, null, 2));
  console.log('Users Error:', usersError);
}

testLoginQuery().catch(console.error);
