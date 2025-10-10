require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAdminRole() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('college_uid, role, first_name, last_name')
    .eq('college_uid', 'ADM000001')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Admin User Details ===');
  console.log('College UID:', data.college_uid);
  console.log('Name:', data.first_name, data.last_name);
  console.log('Role in database:', data.role);
  console.log('\n=== Login Page Check ===');
  console.log('Login page checks for: case "admin"');
  console.log('Match:', data.role === 'admin' ? '✅ MATCH' : '❌ NO MATCH');
}

checkAdminRole();
