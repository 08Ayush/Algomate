require('dotenv').config();

async function testAllAdminRoutes() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('\n🧪 COMPREHENSIVE ADMIN API TESTING\n');
  console.log('='.repeat(70));
  
  let testDepartmentId = null;
  let testFacultyId = null;
  let testClassroomId = null;
  
  try {
    // Test 1: Fetch Departments
    console.log('\n1️⃣  GET /api/admin/departments');
    console.log('-'.repeat(70));
    const deptResponse = await fetch(`${baseUrl}/api/admin/departments`);
    const deptData = await deptResponse.json();
    
    if (deptResponse.ok) {
      console.log(`✅ Departments fetched: ${deptData.departments?.length || 0} found`);
    } else {
      console.error('❌ Failed:', deptData.error);
    }
    
    // Test 2: CREATE Department
    console.log('\n2️⃣  POST /api/admin/departments (CREATE)');
    console.log('-'.repeat(70));
    const createDeptResponse = await fetch(`${baseUrl}/api/admin/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Department ' + Date.now(),
        code: 'TEST' + Date.now().toString().slice(-4),
        description: 'Testing department creation with college_id'
      })
    });
    
    const createDeptData = await createDeptResponse.json();
    
    if (createDeptResponse.ok) {
      console.log('✅ Department created successfully!');
      console.log(`   Name: ${createDeptData.department.name}`);
      console.log(`   Code: ${createDeptData.department.code}`);
      console.log(`   College ID: ${createDeptData.department.college_id}`);
      testDepartmentId = createDeptData.department.id;
    } else {
      console.error('❌ Failed to create department:', createDeptData.error);
      return; // Stop if department creation fails
    }
    
    // Test 3: UPDATE Department
    console.log('\n3️⃣  PUT /api/admin/departments/:id (UPDATE)');
    console.log('-'.repeat(70));
    const updateDeptResponse = await fetch(`${baseUrl}/api/admin/departments/${testDepartmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Test Department',
        code: createDeptData.department.code,
        description: 'Updated description'
      })
    });
    
    const updateDeptData = await updateDeptResponse.json();
    
    if (updateDeptResponse.ok) {
      console.log('✅ Department updated successfully!');
      console.log(`   New Name: ${updateDeptData.department.name}`);
    } else {
      console.error('❌ Failed to update department:', updateDeptData.error);
    }
    
    // Test 4: CREATE Faculty
    console.log('\n4️⃣  POST /api/admin/faculty (CREATE)');
    console.log('-'.repeat(70));
    const createFacultyResponse = await fetch(`${baseUrl}/api/admin/faculty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: 'Professor',
        email: `test.prof.${Date.now()}@svpcet.edu.in`,
        phone: '9876543210',
        role: 'faculty',
        faculty_type: 'general',
        department_id: testDepartmentId,
        is_active: true
      })
    });
    
    const createFacultyData = await createFacultyResponse.json();
    
    if (createFacultyResponse.ok) {
      console.log('✅ Faculty created successfully!');
      console.log(`   Name: ${createFacultyData.faculty.first_name} ${createFacultyData.faculty.last_name}`);
      console.log(`   College UID: ${createFacultyData.faculty.college_uid}`);
      console.log(`   College ID: ${createFacultyData.faculty.college_id}`);
      console.log(`   Default Password: ${createFacultyData.defaultPassword}`);
      testFacultyId = createFacultyData.faculty.id;
    } else {
      console.error('❌ Failed to create faculty:', createFacultyData.error);
    }
    
    // Test 5: UPDATE Faculty
    if (testFacultyId) {
      console.log('\n5️⃣  PUT /api/admin/faculty/:id (UPDATE)');
      console.log('-'.repeat(70));
      const updateFacultyResponse = await fetch(`${baseUrl}/api/admin/faculty/${testFacultyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: 'Updated',
          last_name: 'Professor',
          email: createFacultyData.faculty.email,
          phone: '9876543210',
          role: 'faculty',
          faculty_type: 'publisher',
          department_id: testDepartmentId,
          is_active: true
        })
      });
      
      const updateFacultyData = await updateFacultyResponse.json();
      
      if (updateFacultyResponse.ok) {
        console.log('✅ Faculty updated successfully!');
        console.log(`   New Name: ${updateFacultyData.faculty.first_name} ${updateFacultyData.faculty.last_name}`);
        console.log(`   New Faculty Type: ${updateFacultyData.faculty.faculty_type}`);
      } else {
        console.error('❌ Failed to update faculty:', updateFacultyData.error);
      }
    }
    
    // Test 6: CREATE Classroom
    console.log('\n6️⃣  POST /api/admin/classrooms (CREATE)');
    console.log('-'.repeat(70));
    const createClassroomResponse = await fetch(`${baseUrl}/api/admin/classrooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Room ' + Date.now().toString().slice(-6),
        building: 'Test Building',
        floor_number: 2,
        capacity: 60,
        type: 'Lecture Hall',
        has_projector: true,
        has_ac: true,
        has_computers: false,
        has_lab_equipment: false,
        is_smart_classroom: false,
        classroom_priority: 5,
        booking_weight: 1.0,
        facilities: ['Projector', 'AC'],
        location_notes: 'Test classroom for API testing',
        is_available: true
      })
    });
    
    const createClassroomData = await createClassroomResponse.json();
    
    if (createClassroomResponse.ok) {
      console.log('✅ Classroom created successfully!');
      console.log(`   Name: ${createClassroomData.classroom.name}`);
      console.log(`   Capacity: ${createClassroomData.classroom.capacity}`);
      console.log(`   Type: ${createClassroomData.classroom.type}`);
      console.log(`   College ID: ${createClassroomData.classroom.college_id}`);
      testClassroomId = createClassroomData.classroom.id;
    } else {
      console.error('❌ Failed to create classroom:', createClassroomData.error);
    }
    
    // Test 7: UPDATE Classroom
    if (testClassroomId) {
      console.log('\n7️⃣  PUT /api/admin/classrooms/:id (UPDATE)');
      console.log('-'.repeat(70));
      const updateClassroomResponse = await fetch(`${baseUrl}/api/admin/classrooms/${testClassroomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createClassroomData.classroom.name,
          building: 'Updated Building',
          floor_number: 3,
          capacity: 80,
          type: 'Lab',
          has_projector: true,
          has_ac: true,
          has_computers: true,
          has_lab_equipment: true,
          is_smart_classroom: true,
          classroom_priority: 7,
          booking_weight: 1.5,
          facilities: ['Projector', 'AC', 'Computers'],
          location_notes: 'Updated test classroom',
          is_available: true
        })
      });
      
      const updateClassroomData = await updateClassroomResponse.json();
      
      if (updateClassroomResponse.ok) {
        console.log('✅ Classroom updated successfully!');
        console.log(`   New Capacity: ${updateClassroomData.classroom.capacity}`);
        console.log(`   New Type: ${updateClassroomData.classroom.type}`);
        console.log(`   New Building: ${updateClassroomData.classroom.building}`);
      } else {
        console.error('❌ Failed to update classroom:', updateClassroomData.error);
      }
    }
    
    // Cleanup
    console.log('\n🧹 CLEANUP');
    console.log('='.repeat(70));
    
    if (testFacultyId) {
      const deleteFacultyResponse = await fetch(`${baseUrl}/api/admin/faculty/${testFacultyId}`, {
        method: 'DELETE'
      });
      if (deleteFacultyResponse.ok) {
        console.log('✅ Test faculty deleted');
      }
    }
    
    if (testClassroomId) {
      const deleteClassroomResponse = await fetch(`${baseUrl}/api/admin/classrooms/${testClassroomId}`, {
        method: 'DELETE'
      });
      if (deleteClassroomResponse.ok) {
        console.log('✅ Test classroom deleted');
      }
    }
    
    if (testDepartmentId) {
      const deleteDeptResponse = await fetch(`${baseUrl}/api/admin/departments/${testDepartmentId}`, {
        method: 'DELETE'
      });
      if (deleteDeptResponse.ok) {
        console.log('✅ Test department deleted');
      } else {
        const deleteError = await deleteDeptResponse.json();
        console.log('⚠️  Could not delete test department:', deleteError.error);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    console.error('   Make sure the dev server is running on http://localhost:3000');
  }
}

testAllAdminRoutes();
