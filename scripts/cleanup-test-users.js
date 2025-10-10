const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupAndCheckUsers() {
  try {
    console.log('🧹 Checking and cleaning up existing test users...');
    
    // Get current users
    const { data: currentUsers, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, college_uid, role');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }

    console.log(`📊 Found ${currentUsers.length} existing users:`);
    currentUsers.forEach(user => {
      console.log(`   • ${user.first_name} ${user.last_name} (${user.college_uid}) - ${user.role}`);
    });

    // Check if these are test users (sample data)
    const testUsers = currentUsers.filter(user => 
      ['FAC001', 'FAC002', 'STU001'].includes(user.college_uid) ||
      ['Dr. Rajesh', 'Prof. Priya', 'Arun'].includes(user.first_name)
    );

    if (testUsers.length > 0) {
      console.log(`\n🗑️  Found ${testUsers.length} test users to remove:`);
      testUsers.forEach(user => {
        console.log(`   • ${user.first_name} ${user.last_name} (${user.college_uid})`);
      });

      // Remove test users
      const testUserIds = testUsers.map(u => u.id);
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', testUserIds);

      if (deleteError) {
        console.error('❌ Error deleting test users:', deleteError);
        return;
      }

      console.log('✅ Test users removed successfully');
    } else {
      console.log('✅ No test users found to remove');
    }

    // Also clean up any existing faculty qualifications
    const { error: qualError } = await supabase
      .from('faculty_qualified_subjects')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This will delete all

    if (qualError) {
      console.log('⚠️  Note: Could not clean faculty qualifications:', qualError.message);
    } else {
      console.log('✅ Cleaned existing faculty qualifications');
    }

    console.log('\n🎯 Database is now ready for CSE faculty insertion');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

cleanupAndCheckUsers();