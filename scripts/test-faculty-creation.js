require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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

async function testFacultyCreation() {
  try {
    console.log('\n🔍 Testing Faculty Creation Process...\n');
    
    // Step 1: Check departments
    console.log('Step 1: Fetching departments...');
    const { data: departments, error: deptError } = await supabaseAdmin
      .from('departments')
      .select('id, name, code, college_id')
      .order('name');
    
    if (deptError) {
      console.error('❌ Department fetch error:', deptError);
      return;
    }
    
    console.log(`✅ Found ${departments.length} departments`);
    departments.forEach(dept => {
      console.log(`   - ${dept.name} (${dept.code}) - ID: ${dept.id}, College ID: ${dept.college_id || 'NULL'}`);
    });
    
    if (departments.length === 0) {
      console.error('\n❌ No departments found! Cannot create faculty without departments.');
      return;
    }
    
    // Step 2: Try to create a test faculty
    console.log('\nStep 2: Testing faculty creation...');
    const testDepartmentId = departments[0].id;
    const testCollegeId = departments[0].college_id;
    
    if (!testCollegeId) {
      console.error('❌ Department does not have a college_id! This will cause faculty creation to fail.');
      console.log('   Need to fix: departments must have college_id set.');
      return;
    }
    
    const rolePrefix = 'FAC';
    const randomSuffix = Math.floor(Math.random() * 900000) + 100000;
    const college_uid = `${rolePrefix}${randomSuffix}`;
    const defaultPassword = 'faculty123';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    
    const facultyData = {
      first_name: 'Prof. Ansar',
      last_name: 'Sheikh',
      email: 'sheikh@svpcet.edu.in',
      phone: null,
      college_uid: college_uid,
      password_hash: passwordHash,
      role: 'faculty',
      faculty_type: 'general',
      department_id: testDepartmentId,
      college_id: testCollegeId,  // THIS IS CRITICAL
      is_active: true,
      email_verified: false
    };
    
    console.log('\n📝 Faculty data to insert:');
    console.log(JSON.stringify(facultyData, null, 2));
    
    const { data: newFaculty, error: insertError } = await supabaseAdmin
      .from('users')
      .insert(facultyData)
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        phone,
        role,
        faculty_type,
        department_id,
        college_id,
        is_active,
        departments!users_department_id_fkey(id, name, code)
      `)
      .single();
    
    if (insertError) {
      console.error('\n❌ Faculty creation error:', insertError);
      console.error('   Error details:', JSON.stringify(insertError, null, 2));
      
      // Check if it's a college_id constraint error
      if (insertError.message.includes('college_id') || insertError.message.includes('not-null')) {
        console.error('\n⚠️  ISSUE: The college_id field is required but missing!');
        console.error('   Solution: The faculty creation API route needs to fetch college_id from the department.');
      }
      return;
    }
    
    console.log('\n✅ Faculty created successfully!');
    console.log('   Details:', JSON.stringify(newFaculty, null, 2));
    
    // Cleanup test user
    console.log('\n🧹 Cleaning up test faculty...');
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', newFaculty.id);
    console.log('✅ Test cleanup complete');
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

testFacultyCreation();
