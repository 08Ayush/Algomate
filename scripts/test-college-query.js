const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCollegeQuery() {
  console.log('Testing college query...\n');
  
  // Test current query
  console.log('1. Current query (with count):');
  const { data: colleges1, error: error1 } = await supabase
    .from('colleges')
    .select(`
      *,
      departments:departments(count),
      users:users(count)
    `)
    .order('created_at', { ascending: false });
  
  console.log('Colleges:', JSON.stringify(colleges1, null, 2));
  console.log('Error:', error1);
  
  // Test simple query
  console.log('\n2. Simple query (without count):');
  const { data: colleges2, error: error2 } = await supabase
    .from('colleges')
    .select('*')
    .order('created_at', { ascending: false });
  
  console.log('Colleges:', JSON.stringify(colleges2, null, 2));
  console.log('Error:', error2);
  
  // Test admin query
  console.log('\n3. College admins query:');
  const { data: admins, error: error3 } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      college_uid,
      phone,
      is_active,
      college_id,
      colleges!users_college_id_fkey(name, code)
    `)
    .eq('role', 'college_admin')
    .order('created_at', { ascending: false });
  
  console.log('Admins:', JSON.stringify(admins, null, 2));
  console.log('Error:', error3);
}

testCollegeQuery().catch(console.error);
