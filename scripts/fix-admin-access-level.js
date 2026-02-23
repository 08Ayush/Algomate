require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixAdminAccessLevel() {
  console.log('=== Fixing Admin Access Level ===\n');

  // First, check current status
  const { data: before, error: beforeError } = await supabaseAdmin
    .from('users')
    .select('college_uid, first_name, last_name, role, access_level')
    .eq('college_uid', 'ADM000001')
    .single();

  if (beforeError) {
    console.error('❌ Error fetching admin user:', beforeError.message);
    return;
  }

  console.log('📋 Current Status:');
  console.log('   College UID:', before.college_uid);
  console.log('   Name:', before.first_name, before.last_name);
  console.log('   Role:', before.role);
  console.log('   Access Level:', before.access_level);
  console.log('');

  // Update access_level to 'admin' for college_admin role
  const { data: updated, error: updateError } = await supabaseAdmin
    .from('users')
    .update({ access_level: 'admin' })
    .eq('role', 'college_admin')
    .select();

  if (updateError) {
    console.error('❌ Error updating access level:', updateError.message);
    return;
  }

  console.log('✅ Successfully updated access level for college_admin users');
  console.log('');

  // Verify the change
  const { data: after, error: afterError } = await supabaseAdmin
    .from('users')
    .select('college_uid, first_name, last_name, role, access_level')
    .eq('college_uid', 'ADM000001')
    .single();

  if (afterError) {
    console.error('❌ Error verifying update:', afterError.message);
    return;
  }

  console.log('📋 Updated Status:');
  console.log('   College UID:', after.college_uid);
  console.log('   Name:', after.first_name, after.last_name);
  console.log('   Role:', after.role);
  console.log('   Access Level:', after.access_level);
  console.log('');

  if (after.access_level === 'admin') {
    console.log('✅ FIXED: Access level is now "admin"');
  } else {
    console.log('⚠️  Warning: Access level is still:', after.access_level);
  }

  console.log('\n=== Summary ===');
  console.log('Changed from:', before.access_level, '→', after.access_level);
}

fixAdminAccessLevel().catch(console.error);
