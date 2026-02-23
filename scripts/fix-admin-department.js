require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function fixAdminDepartmentAssociation() {
  console.log('\n🔧 Fixing Admin Department Association\n');
  console.log('='.repeat(70));
  
  try {
    // Step 1: Check current admin users (college_admin role)
    console.log('\n1️⃣  Checking current college admin users...');
    const { data: adminsBefore, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, college_uid, role, department_id, college_id')
      .eq('role', 'college_admin');
    
    if (fetchError) {
      console.error('❌ Error fetching admins:', fetchError);
      return;
    }
    
    console.log(`Found ${adminsBefore.length} college admin user(s):\n`);
    adminsBefore.forEach(admin => {
      console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   College UID: ${admin.college_uid}`);
      console.log(`   College ID: ${admin.college_id}`);
      console.log(`   Department ID: ${admin.department_id || 'NULL'}`);
      console.log(`   Status: ${admin.department_id ? '⚠️  NEEDS FIX (has department)' : '✅ OK (no department)'}`);
      console.log('');
    });
    
    // Step 2: Update admin users to remove department association
    const adminsWithDept = adminsBefore.filter(admin => admin.department_id !== null);
    
    if (adminsWithDept.length === 0) {
      console.log('✅ All college admin users already have NULL department_id. No changes needed!\n');
      return;
    }
    
    console.log(`\n2️⃣  Updating ${adminsWithDept.length} college admin user(s) to remove department association...`);
    
    const { data: updatedAdmins, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ department_id: null })
      .eq('role', 'college_admin')
      .select('id, first_name, last_name, email, college_uid, department_id, college_id');
    
    if (updateError) {
      console.error('❌ Error updating admins:', updateError);
      return;
    }
    
    console.log('✅ College admin users updated successfully!\n');
    
    // Step 3: Verify the update
    console.log('3️⃣  Verifying changes...\n');
    const { data: adminsAfter, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, email, college_uid, role, department_id, college_id')
      .eq('role', 'college_admin');
    
    if (verifyError) {
      console.error('❌ Error verifying admins:', verifyError);
      return;
    }
    
    adminsAfter.forEach(admin => {
      console.log(`   ✅ ${admin.first_name} ${admin.last_name}`);
      console.log(`      College UID: ${admin.college_uid}`);
      console.log(`      College ID: ${admin.college_id}`);
      console.log(`      Department ID: ${admin.department_id === null ? 'NULL ✓' : admin.department_id + ' ✗'}`);
      console.log('');
    });
    
    console.log('='.repeat(70));
    console.log('✅ SUCCESS: College admin users are now college-level only!');
    console.log('   - Admins have NO department association');
    console.log('   - Admins are verified using college_id only');
    console.log('   - Admins can manage ALL departments\n');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Execute the fix
fixAdminDepartmentAssociation();
