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

async function testDepartmentAndClassroomCreation() {
  console.log('\n🧪 Testing Department and Classroom Creation\n');
  console.log('='.repeat(60));
  
  try {
    // Get college_id
    const { data: colleges } = await supabaseAdmin
      .from('colleges')
      .select('id, name')
      .limit(1);
    
    if (!colleges || colleges.length === 0) {
      console.error('❌ No colleges found in database!');
      return;
    }
    
    const college_id = colleges[0].id;
    console.log(`\n✅ Found college: ${colleges[0].name}`);
    console.log(`   College ID: ${college_id}`);
    
    // Test 1: Create Department WITHOUT college_id
    console.log('\n\n1️⃣  Testing Department Creation WITHOUT college_id');
    console.log('-'.repeat(60));
    const { data: dept1, error: deptError1 } = await supabaseAdmin
      .from('departments')
      .insert({
        name: 'Test Department Without College',
        code: 'TESTDEPT1',
        description: 'Testing without college_id'
      })
      .select()
      .single();
    
    if (deptError1) {
      console.error('❌ Error (Expected):', deptError1.message);
      if (deptError1.message.includes('college_id')) {
        console.log('   ✅ Confirmed: college_id is REQUIRED for departments');
      }
    } else {
      console.log('✅ Department created (unexpected!):', dept1);
      // Cleanup
      await supabaseAdmin.from('departments').delete().eq('id', dept1.id);
    }
    
    // Test 2: Create Department WITH college_id
    console.log('\n\n2️⃣  Testing Department Creation WITH college_id');
    console.log('-'.repeat(60));
    const { data: dept2, error: deptError2 } = await supabaseAdmin
      .from('departments')
      .insert({
        name: 'Test Department With College',
        code: 'TESTDEPT2',
        description: 'Testing with college_id',
        college_id: college_id
      })
      .select()
      .single();
    
    if (deptError2) {
      console.error('❌ Error:', deptError2.message);
    } else {
      console.log('✅ Department created successfully!');
      console.log(`   Name: ${dept2.name}`);
      console.log(`   Code: ${dept2.code}`);
      console.log(`   College ID: ${dept2.college_id}`);
      
      // Cleanup
      await supabaseAdmin.from('departments').delete().eq('id', dept2.id);
      console.log('   🧹 Test department cleaned up');
    }
    
    // Test 3: Create Classroom WITHOUT college_id
    console.log('\n\n3️⃣  Testing Classroom Creation WITHOUT college_id');
    console.log('-'.repeat(60));
    const { data: classroom1, error: classError1 } = await supabaseAdmin
      .from('classrooms')
      .insert({
        name: 'Test Classroom Without College',
        capacity: 30,
        type: 'Lecture Hall',
        has_projector: false,
        has_ac: false,
        has_computers: false,
        has_lab_equipment: false,
        is_smart_classroom: false,
        classroom_priority: 5,
        booking_weight: 1.0,
        facilities: [],
        is_available: true
      })
      .select()
      .single();
    
    if (classError1) {
      console.error('❌ Error (Expected):', classError1.message);
      if (classError1.message.includes('college_id')) {
        console.log('   ✅ Confirmed: college_id is REQUIRED for classrooms');
      }
    } else {
      console.log('✅ Classroom created (unexpected!):', classroom1);
      // Cleanup
      await supabaseAdmin.from('classrooms').delete().eq('id', classroom1.id);
    }
    
    // Test 4: Create Classroom WITH college_id
    console.log('\n\n4️⃣  Testing Classroom Creation WITH college_id');
    console.log('-'.repeat(60));
    const { data: classroom2, error: classError2 } = await supabaseAdmin
      .from('classrooms')
      .insert({
        name: 'Test Classroom With College',
        capacity: 30,
        type: 'Lecture Hall',
        college_id: college_id,
        has_projector: false,
        has_ac: false,
        has_computers: false,
        has_lab_equipment: false,
        is_smart_classroom: false,
        classroom_priority: 5,
        booking_weight: 1.0,
        facilities: [],
        is_available: true
      })
      .select()
      .single();
    
    if (classError2) {
      console.error('❌ Error:', classError2.message);
    } else {
      console.log('✅ Classroom created successfully!');
      console.log(`   Name: ${classroom2.name}`);
      console.log(`   Capacity: ${classroom2.capacity}`);
      console.log(`   Type: ${classroom2.type}`);
      console.log(`   College ID: ${classroom2.college_id}`);
      
      // Cleanup
      await supabaseAdmin.from('classrooms').delete().eq('id', classroom2.id);
      console.log('   🧹 Test classroom cleaned up');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test error:', error);
  }
}

testDepartmentAndClassroomCreation();
