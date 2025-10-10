require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testLogin() {
  const testCredentials = [
    { collegeUid: 'ADM000001', password: 'admin123', expectedRole: 'admin' },
  ];

  for (const cred of testCredentials) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing login for College UID: ${cred.collegeUid}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Find user by college_uid
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          college_uid,
          email,
          password_hash,
          role,
          faculty_type,
          is_active,
          departments!users_department_id_fkey(id, name, code)
        `)
        .eq('college_uid', cred.collegeUid)
        .eq('is_active', true)
        .single();

      if (userError) {
        console.error('❌ User lookup error:', userError.message);
        continue;
      }

      if (!userData) {
        console.error('❌ User not found');
        continue;
      }

      console.log('✅ User found:');
      console.log('   - Name:', `${userData.first_name} ${userData.last_name}`);
      console.log('   - Email:', userData.email);
      console.log('   - College UID:', userData.college_uid);
      console.log('   - Role:', userData.role);
      console.log('   - Department:', userData.departments?.name || 'N/A');
      console.log('   - Active:', userData.is_active);

      // Step 2: Verify password
      const isValidPassword = await bcrypt.compare(cred.password, userData.password_hash);
      
      if (isValidPassword) {
        console.log('✅ Password verification: SUCCESS');
        console.log('✅ Login test: PASSED');
        
        if (userData.role === cred.expectedRole) {
          console.log(`✅ Role verification: PASSED (${userData.role})`);
        } else {
          console.log(`⚠️  Role mismatch: Expected ${cred.expectedRole}, got ${userData.role}`);
        }
      } else {
        console.log('❌ Password verification: FAILED');
        console.log('   Expected password:', cred.password);
        console.log('   Password hash exists:', !!userData.password_hash);
      }

    } catch (error) {
      console.error('❌ Error during test:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Testing complete!');
  console.log('='.repeat(60));
}

// Also list all users
async function listAllUsers() {
  console.log('\n' + '='.repeat(60));
  console.log('ALL USERS IN DATABASE');
  console.log('='.repeat(60));

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      college_uid,
      email,
      role,
      is_active,
      departments!users_department_id_fkey(name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('No users found in database!');
    console.log('\n💡 Run "node create-admin.js" to create an admin user');
    return;
  }

  console.log(`\nFound ${users.length} user(s):\n`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
    console.log(`   College UID: ${user.college_uid}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Department: ${user.departments?.name || 'N/A'}`);
    console.log(`   Active: ${user.is_active ? '✅' : '❌'}`);
    console.log('');
  });
}

async function run() {
  await listAllUsers();
  await testLogin();
  process.exit(0);
}

run();
