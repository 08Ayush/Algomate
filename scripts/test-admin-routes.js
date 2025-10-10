require('dotenv').config();

async function testAdminRoutes() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('\n🧪 Testing Admin API Routes\n');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Fetch Departments
    console.log('\n1️⃣  Testing GET /api/admin/departments');
    const deptResponse = await fetch(`${baseUrl}/api/admin/departments`);
    const deptData = await deptResponse.json();
    
    if (deptResponse.ok) {
      console.log(`✅ Departments fetched: ${deptData.departments?.length || 0} found`);
      if (deptData.departments && deptData.departments.length > 0) {
        console.log(`   Sample: ${deptData.departments[0].name} (${deptData.departments[0].code})`);
      }
    } else {
      console.error('❌ Failed to fetch departments:', deptData.error);
    }
    
    // Test 2: Fetch Faculty
    console.log('\n2️⃣  Testing GET /api/admin/faculty');
    const facultyResponse = await fetch(`${baseUrl}/api/admin/faculty`);
    const facultyData = await facultyResponse.json();
    
    if (facultyResponse.ok) {
      console.log(`✅ Faculty fetched: ${facultyData.faculty?.length || 0} found`);
      if (facultyData.faculty && facultyData.faculty.length > 0) {
        console.log(`   Sample: ${facultyData.faculty[0].first_name} ${facultyData.faculty[0].last_name} (${facultyData.faculty[0].role})`);
      }
    } else {
      console.error('❌ Failed to fetch faculty:', facultyData.error);
    }
    
    // Test 3: Fetch Classrooms
    console.log('\n3️⃣  Testing GET /api/admin/classrooms');
    const classroomResponse = await fetch(`${baseUrl}/api/admin/classrooms`);
    const classroomData = await classroomResponse.json();
    
    if (classroomResponse.ok) {
      console.log(`✅ Classrooms fetched: ${classroomData.classrooms?.length || 0} found`);
      if (classroomData.classrooms && classroomData.classrooms.length > 0) {
        console.log(`   Sample: ${classroomData.classrooms[0].name} (${classroomData.classrooms[0].type})`);
      }
    } else {
      console.error('❌ Failed to fetch classrooms:', classroomData.error);
    }
    
    // Test 4: Create Faculty (if departments exist)
    if (deptData.departments && deptData.departments.length > 0) {
      console.log('\n4️⃣  Testing POST /api/admin/faculty');
      
      const testFaculty = {
        first_name: 'Test',
        last_name: 'Professor',
        email: `test.professor.${Date.now()}@svpcet.edu.in`,
        phone: '9876543210',
        role: 'faculty',
        faculty_type: 'general',
        department_id: deptData.departments[0].id,
        is_active: true
      };
      
      const createFacultyResponse = await fetch(`${baseUrl}/api/admin/faculty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testFaculty)
      });
      
      const createFacultyData = await createFacultyResponse.json();
      
      if (createFacultyResponse.ok) {
        console.log('✅ Faculty created successfully!');
        console.log(`   Name: ${createFacultyData.faculty.first_name} ${createFacultyData.faculty.last_name}`);
        console.log(`   College UID: ${createFacultyData.faculty.college_uid}`);
        console.log(`   Default Password: ${createFacultyData.defaultPassword}`);
        
        // Clean up test faculty
        const deleteResponse = await fetch(`${baseUrl}/api/admin/faculty/${createFacultyData.faculty.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log('   🧹 Test faculty cleaned up');
        }
      } else {
        console.error('❌ Failed to create faculty:', createFacultyData.error);
        console.error('   Details:', JSON.stringify(createFacultyData, null, 2));
      }
    } else {
      console.log('\n4️⃣  Skipping faculty creation test (no departments found)');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error('   Make sure the dev server is running on http://localhost:3000');
  }
}

testAdminRoutes();
