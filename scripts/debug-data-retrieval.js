// Debug script to check faculty and subjects data retrieval issues
const { supabase } = require('./src/lib/supabase.js');

async function debugDataRetrieval() {
  try {
    console.log('🔍 Debugging Faculty and Subjects Data Retrieval...\n');

    // First, let's check what user data looks like
    console.log('Step 1: Checking sample user data structure...\n');
    
    const { data: sampleUser, error: userError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, department_id, college_id, role')
      .eq('email', 'bramhe@svpce.edu.in')
      .single();

    if (userError || !sampleUser) {
      console.log('❌ User not found:', userError);
      return;
    }

    console.log('✅ Sample User Data:');
    console.log(`   ID: ${sampleUser.id}`);
    console.log(`   Name: ${sampleUser.first_name} ${sampleUser.last_name}`);
    console.log(`   Email: ${sampleUser.email}`);
    console.log(`   Department ID: ${sampleUser.department_id}`);
    console.log(`   College ID: ${sampleUser.college_id}`);
    console.log(`   Role: ${sampleUser.role}\n`);

    // Check if department_id exists
    if (!sampleUser.department_id) {
      console.log('❌ ISSUE FOUND: User has no department_id assigned!');
      console.log('   This will cause faculty and subjects queries to fail.\n');
    }

    // Step 2: Check faculty data
    console.log('Step 2: Testing Faculty Data Retrieval...\n');

    let facultyQuery = supabase
      .from('users')
      .select('id, first_name, last_name, email, department_id')
      .eq('role', 'faculty')
      .eq('is_active', true);

    if (sampleUser.department_id) {
      facultyQuery = facultyQuery.eq('department_id', sampleUser.department_id);
    }

    const { data: facultyData, error: facultyError } = await facultyQuery;

    if (facultyError) {
      console.log('❌ Faculty Query Error:', facultyError);
    } else {
      console.log(`✅ Faculty Data Retrieved: ${facultyData?.length || 0} records`);
      if (facultyData && facultyData.length > 0) {
        console.log('   Sample faculty:');
        facultyData.slice(0, 3).forEach((f, i) => {
          console.log(`   ${i + 1}. ${f.first_name} ${f.last_name} (${f.email})`);
        });
      } else {
        console.log('   ⚠️  No faculty found for this department');
      }
    }
    console.log('');

    // Step 3: Check subjects data
    console.log('Step 3: Testing Subjects Data Retrieval...\n');

    let subjectsQuery = supabase
      .from('subjects')
      .select('id, name, code, subject_type, credits, requires_lab, semester')
      .eq('is_active', true)
      .order('semester', { ascending: true });

    if (sampleUser.department_id) {
      subjectsQuery = subjectsQuery.eq('department_id', sampleUser.department_id);
    }

    const { data: subjectsData, error: subjectsError } = await subjectsQuery;

    if (subjectsError) {
      console.log('❌ Subjects Query Error:', subjectsError);
    } else {
      console.log(`✅ Subjects Data Retrieved: ${subjectsData?.length || 0} records`);
      if (subjectsData && subjectsData.length > 0) {
        console.log('   Sample subjects by semester:');
        const subjectsBySemester = {};
        subjectsData.forEach(s => {
          const sem = s.semester || 'Unknown';
          if (!subjectsBySemester[sem]) subjectsBySemester[sem] = [];
          subjectsBySemester[sem].push(s);
        });
        
        Object.keys(subjectsBySemester).sort().forEach(sem => {
          console.log(`   Semester ${sem}: ${subjectsBySemester[sem].length} subjects`);
          subjectsBySemester[sem].slice(0, 2).forEach(s => {
            console.log(`     - ${s.name} (${s.code})`);
          });
        });
      } else {
        console.log('   ⚠️  No subjects found for this department');
      }
    }
    console.log('');

    // Step 4: Check faculty qualifications
    console.log('Step 4: Testing Faculty Qualifications...\n');

    const { data: qualificationsData, error: qualError } = await supabase
      .from('faculty_qualified_subjects')
      .select(`
        faculty_id,
        subject_id,
        proficiency_level,
        subjects!inner(id, name, code, semester)
      `)
      .limit(10);

    if (qualError) {
      console.log('❌ Qualifications Query Error:', qualError);
    } else {
      console.log(`✅ Faculty Qualifications Retrieved: ${qualificationsData?.length || 0} records`);
      if (qualificationsData && qualificationsData.length > 0) {
        console.log('   Sample qualifications:');
        qualificationsData.slice(0, 5).forEach((q, i) => {
          console.log(`   ${i + 1}. Faculty ${q.faculty_id.slice(0, 8)}... → ${q.subjects.name} (${q.subjects.code})`);
        });
      }
    }
    console.log('');

    // Step 5: Check department and college structure
    console.log('Step 5: Checking Department and College Structure...\n');

    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('id, name, code, college_id')
      .eq('is_active', true);

    if (!deptError && departments) {
      console.log(`✅ Departments Found: ${departments.length}`);
      departments.forEach(d => {
        console.log(`   - ${d.name} (${d.code}) - ID: ${d.id}`);
      });
    }

    const { data: colleges, error: collegeError } = await supabase
      .from('colleges')
      .select('id, name, code')
      .eq('is_active', true);

    if (!collegeError && colleges) {
      console.log(`✅ Colleges Found: ${colleges.length}`);
      colleges.forEach(c => {
        console.log(`   - ${c.name} (${c.code}) - ID: ${c.id}`);
      });
    }
    console.log('');

    // Step 6: Provide diagnostics
    console.log('🎯 DIAGNOSTIC SUMMARY:');
    
    if (!sampleUser.department_id) {
      console.log('❌ CRITICAL ISSUE: User missing department_id');
      console.log('   SOLUTION: Update user record with proper department_id');
    }
    
    if (!facultyData || facultyData.length === 0) {
      console.log('❌ ISSUE: No faculty found in department');
      console.log('   SOLUTION: Check if faculty records have correct department_id');
    }
    
    if (!subjectsData || subjectsData.length === 0) {
      console.log('❌ ISSUE: No subjects found in department');
      console.log('   SOLUTION: Check if subjects have correct department_id and semester values');
    }
    
    if (!qualificationsData || qualificationsData.length === 0) {
      console.log('❌ ISSUE: No faculty qualifications found');
      console.log('   SOLUTION: Check faculty_qualified_subjects table');
    }

    if (sampleUser.department_id && facultyData && facultyData.length > 0 && 
        subjectsData && subjectsData.length > 0) {
      console.log('✅ DATA RETRIEVAL LOOKS GOOD');
      console.log('   The issue might be in the React component or data transformation');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug
debugDataRetrieval();