require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, college_uid, role, department_id, college_id')
    .order('role');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n📋 All Users in Database:\n');
  console.log('='.repeat(80));
  
  const adminUsers = [];
  const facultyUsers = [];
  const studentUsers = [];
  
  data.forEach(u => {
    const info = {
      role: u.role,
      name: `${u.first_name} ${u.last_name}`,
      uid: u.college_uid,
      dept_id: u.department_id || 'NULL',
      college_id: u.college_id
    };
    
    if (u.role === 'admin') adminUsers.push(info);
    else if (u.role === 'faculty') facultyUsers.push(info);
    else if (u.role === 'student') studentUsers.push(info);
  });
  
  console.log(`\n👑 ADMIN USERS (${adminUsers.length}):`);
  adminUsers.forEach(u => {
    console.log(`   ${u.name} (${u.uid})`);
    console.log(`   Department ID: ${u.dept_id}`);
    console.log(`   College ID: ${u.college_id}`);
    console.log(`   Status: ${u.dept_id === 'NULL' ? '✅ No department (correct)' : '⚠️  Has department (needs fix)'}`);
    console.log('');
  });
  
  console.log(`\n👨‍🏫 FACULTY USERS (${facultyUsers.length}):`);
  facultyUsers.slice(0, 3).forEach(u => {
    console.log(`   ${u.name} (${u.uid}) - Dept: ${u.dept_id}`);
  });
  if (facultyUsers.length > 3) console.log(`   ... and ${facultyUsers.length - 3} more`);
  
  console.log(`\n🎓 STUDENT USERS (${studentUsers.length}):`);
  studentUsers.slice(0, 3).forEach(u => {
    console.log(`   ${u.name} (${u.uid}) - Dept: ${u.dept_id}`);
  });
  if (studentUsers.length > 3) console.log(`   ... and ${studentUsers.length - 3} more`);
  
  console.log('\n' + '='.repeat(80));
})();
