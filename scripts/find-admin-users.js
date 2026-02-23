require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Check the users table for college_admin or similar
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, college_uid, role, department_id, college_id')
    .order('college_uid');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n🔍 Checking User Roles:\n');
  console.log('='.repeat(80));
  
  // Find users with college_uid starting with ADM
  const adminLikeUsers = data.filter(u => u.college_uid && u.college_uid.startsWith('ADM'));
  
  console.log(`\n🔎 Users with College UID starting with "ADM" (${adminLikeUsers.length}):\n`);
  
  if (adminLikeUsers.length === 0) {
    console.log('   ⚠️  No users found with ADM prefix!');
    console.log('   Looking for any user with "admin" in role field...\n');
    
    const adminRoleUsers = data.filter(u => 
      u.role && (
        u.role.toLowerCase().includes('admin') || 
        u.role === 'college_admin' || 
        u.role === 'super_admin'
      )
    );
    
    if (adminRoleUsers.length > 0) {
      console.log(`   Found ${adminRoleUsers.length} user(s) with admin-like role:\n`);
      adminRoleUsers.forEach(u => {
        console.log(`   👤 ${u.first_name} ${u.last_name}`);
        console.log(`      UID: ${u.college_uid}`);
        console.log(`      Role: ${u.role}`);
        console.log(`      Department ID: ${u.department_id || 'NULL'}`);
        console.log(`      College ID: ${u.college_id}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No users found with admin role either!');
      console.log('\n   All unique roles in database:');
      const roles = [...new Set(data.map(u => u.role))];
      roles.forEach(role => console.log(`      - ${role}`));
    }
  } else {
    adminLikeUsers.forEach(u => {
      console.log(`   👤 ${u.first_name} ${u.last_name}`);
      console.log(`      UID: ${u.college_uid}`);
      console.log(`      Role: ${u.role}`);
      console.log(`      Department ID: ${u.department_id || 'NULL'}`);
      console.log(`      College ID: ${u.college_id}`);
      console.log(`      ${u.department_id ? '⚠️  Needs Fix: Remove department' : '✅ OK: No department'}`);
      console.log('');
    });
  }
  
  console.log('='.repeat(80));
})();
