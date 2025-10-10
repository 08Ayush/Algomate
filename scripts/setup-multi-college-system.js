const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupMultiCollegeSchema() {
  try {
    console.log('🚀 Setting up Multi-College PyGram Schema...');
    
    // Check if the schema is already set up
    console.log('📋 Checking existing schema...');
    const { data: existingColleges, error: collegeCheckError } = await supabase
      .from('colleges')
      .select('id, name, code')
      .limit(1);

    if (existingColleges && existingColleges.length > 0) {
      console.log('✅ Multi-college schema already exists!');
      console.log('📊 Current colleges:');
      
      const { data: allColleges } = await supabase
        .from('colleges')
        .select('name, code, city, state')
        .order('name');
      
      allColleges?.forEach(college => {
        console.log(`  • ${college.name} (${college.code}) - ${college.city}, ${college.state}`);
      });
      
      return;
    }

    console.log('⚙️  New schema setup required. Please run the updated schema SQL file manually in Supabase.');
    console.log('📁 File: database/new_schema.sql');
    console.log('');
    console.log('🔧 After running the schema, the system will support:');
    console.log('   ✓ Multi-college architecture');
    console.log('   ✓ Multi-department management per college');
    console.log('   ✓ Student access control by semester/class');
    console.log('   ✓ Creator and Publisher workflow system');
    console.log('   ✓ Enhanced algorithm support');
    console.log('   ✓ Role-based access control (RBAC)');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function insertCSESubjectsWithCollegeSupport() {
  try {
    console.log('\n📚 Inserting CSE subjects with multi-college support...');
    
    // Get colleges
    const { data: colleges, error: collegesError } = await supabase
      .from('colleges')
      .select('id, name, code');
    
    if (collegesError || !colleges || colleges.length === 0) {
      console.log('⚠️  No colleges found. Please set up the schema first.');
      return;
    }
    
    console.log(`Found ${colleges.length} colleges`);
    
    // For each college, get CSE department and insert subjects
    for (const college of colleges) {
      console.log(`\n🎓 Processing ${college.name} (${college.code})...`);
      
      const { data: cseDept, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('college_id', college.id)
        .eq('code', 'CSE')
        .single();
      
      if (deptError || !cseDept) {
        console.log(`   ⚠️  No CSE department found in ${college.name}`);
        continue;
      }
      
      console.log(`   ✅ Found CSE department: ${cseDept.name}`);
      
      // Insert CSE subjects for this college
      const cseSubjects = [
        { name: 'Data Structures & Algorithms', code: 'DSA', credits_per_week: 3, subject_type: 'THEORY' },
        { name: 'Data Structures Lab', code: 'DSA_LAB', credits_per_week: 1, subject_type: 'LAB' },
        { name: 'Database Management Systems', code: 'DBMS', credits_per_week: 3, subject_type: 'THEORY' },
        { name: 'Database Lab', code: 'DBMS_LAB', credits_per_week: 1, subject_type: 'LAB' },
        { name: 'Operating Systems', code: 'OS', credits_per_week: 3, subject_type: 'THEORY' },
        { name: 'Operating Systems Lab', code: 'OS_LAB', credits_per_week: 1, subject_type: 'LAB' },
        { name: 'Computer Networks', code: 'CN', credits_per_week: 3, subject_type: 'THEORY' },
        { name: 'Networks Lab', code: 'CN_LAB', credits_per_week: 1, subject_type: 'LAB' },
        { name: 'Software Engineering', code: 'SE', credits_per_week: 3, subject_type: 'THEORY' },
        { name: 'Web Development Project', code: 'WEB_DEV', credits_per_week: 2, subject_type: 'PRACTICAL' }
      ];
      
      const subjectsWithIds = cseSubjects.map(subject => ({
        ...subject,
        college_id: college.id,
        department_id: cseDept.id
      }));
      
      const { data: insertedSubjects, error: insertError } = await supabase
        .from('subjects')
        .upsert(subjectsWithIds, {
          onConflict: 'college_id,department_id,code',
          ignoreDuplicates: false
        })
        .select();
      
      if (insertError) {
        console.log(`   ❌ Error inserting subjects: ${insertError.message}`);
        continue;
      }
      
      console.log(`   ✅ Inserted ${insertedSubjects?.length || cseSubjects.length} CSE subjects`);
    }
    
  } catch (error) {
    console.error('❌ Error in CSE subjects insertion:', error);
  }
}

async function createSampleData() {
  try {
    console.log('\n🔧 Creating sample users and batches...');
    
    // Get the first college for sample data
    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .select('id, name, code')
      .limit(1)
      .single();
    
    if (collegeError || !college) {
      console.log('⚠️  No college found for sample data creation');
      return;
    }
    
    // Get CSE department
    const { data: cseDept, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('college_id', college.id)
      .eq('code', 'CSE')
      .single();
    
    if (deptError || !cseDept) {
      console.log('⚠️  No CSE department found for sample data');
      return;
    }
    
    console.log(`📍 Using ${college.name} - ${cseDept.name} for sample data`);
    
    // Create sample users
    const sampleUsers = [
      {
        first_name: 'Dr. Rajesh',
        last_name: 'Kumar',
        college_uid: 'FAC001',
        email: 'rajesh.kumar@abcit.edu',
        password_hash: '$2b$12$dummy_hash_for_demo',
        college_id: college.id,
        department_id: cseDept.id,
        role: 'faculty',
        faculty_type: 'creator',
        can_create_timetables: true,
        can_publish_timetables: false,
        max_hours_per_day: 6,
        max_hours_per_week: 30
      },
      {
        first_name: 'Prof. Priya',
        last_name: 'Sharma',
        college_uid: 'FAC002',
        email: 'priya.sharma@abcit.edu',
        password_hash: '$2b$12$dummy_hash_for_demo',
        college_id: college.id,
        department_id: cseDept.id,
        role: 'faculty',
        faculty_type: 'publisher',
        can_create_timetables: true,
        can_publish_timetables: true,
        can_approve_timetables: true,
        max_hours_per_day: 6,
        max_hours_per_week: 30
      },
      {
        first_name: 'Arun',
        last_name: 'Patel',
        college_uid: 'STU001',
        student_id: 'CS2025001',
        email: 'arun.patel@student.abcit.edu',
        password_hash: '$2b$12$dummy_hash_for_demo',
        college_id: college.id,
        department_id: cseDept.id,
        role: 'student',
        admission_year: 2025,
        current_semester: 3
      },
      {
        first_name: 'Sneha',
        last_name: 'Reddy',
        college_uid: 'STU002',
        student_id: 'CS2025002',
        email: 'sneha.reddy@student.abcit.edu',
        password_hash: '$2b$12$dummy_hash_for_demo',
        college_id: college.id,
        department_id: cseDept.id,
        role: 'student',
        admission_year: 2025,
        current_semester: 3
      }
    ];
    
    const { data: insertedUsers, error: userError } = await supabase
      .from('users')
      .upsert(sampleUsers, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select();
    
    if (userError) {
      console.log(`❌ Error creating sample users: ${userError.message}`);
      return;
    }
    
    console.log(`✅ Created ${insertedUsers?.length || sampleUsers.length} sample users`);
    
    // Create sample batch
    const sampleBatch = {
      name: 'CSE-3A',
      college_id: college.id,
      department_id: cseDept.id,
      semester: 3,
      academic_year: '2025-26',
      section: 'A',
      expected_strength: 60,
      actual_strength: 58,
      max_hours_per_day: 6,
      preferred_start_time: '09:00:00',
      preferred_end_time: '16:00:00'
    };
    
    const { data: insertedBatch, error: batchError } = await supabase
      .from('batches')
      .upsert([sampleBatch], {
        onConflict: 'college_id,department_id,semester,academic_year,name,section',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (batchError) {
      console.log(`❌ Error creating sample batch: ${batchError.message}`);
      return;
    }
    
    console.log(`✅ Created sample batch: ${sampleBatch.name}`);
    
    // Enroll students in the batch
    const students = insertedUsers?.filter(u => u.role === 'student') || [];
    if (students.length > 0) {
      const enrollments = students.map(student => ({
        student_id: student.id,
        batch_id: insertedBatch.id
      }));
      
      const { error: enrollmentError } = await supabase
        .from('student_batch_enrollment')
        .upsert(enrollments, {
          onConflict: 'student_id,batch_id',
          ignoreDuplicates: true
        });
      
      if (!enrollmentError) {
        console.log(`✅ Enrolled ${students.length} students in batch`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  }
}

async function displaySystemSummary() {
  try {
    console.log('\n📊 MULTI-COLLEGE PYGRAM SYSTEM SUMMARY');
    console.log('==========================================');
    
    // Colleges summary
    const { data: colleges } = await supabase
      .from('colleges')
      .select('id, name, code, city, state')
      .order('name');
    
    if (colleges && colleges.length > 0) {
      console.log(`\n🎓 Colleges (${colleges.length}):`);
      for (const college of colleges) {
        console.log(`   • ${college.name} (${college.code}) - ${college.city}, ${college.state}`);
        
        // Get departments for this college
        const { data: departments } = await supabase
          .from('departments')
          .select('name, code')
          .eq('college_id', college.id)
          .order('name');
        
        if (departments && departments.length > 0) {
          console.log(`     Departments: ${departments.map(d => d.name + ' (' + d.code + ')').join(', ')}`);
        }
      }
    }
    
    // Users summary
    const { data: userCounts } = await supabase
      .from('users')
      .select('role, college_id, colleges(name)')
      .order('role');
    
    if (userCounts) {
      const summary = {};
      userCounts.forEach(user => {
        const key = `${user.colleges?.name || 'Unknown'} - ${user.role}`;
        summary[key] = (summary[key] || 0) + 1;
      });
      
      console.log(`\n👥 Users by College & Role:`);
      Object.entries(summary).forEach(([key, count]) => {
        console.log(`   • ${key}: ${count}`);
      });
    }
    
    // Access control features
    console.log(`\n🔐 Access Control Features:`);
    console.log(`   ✓ Students can only see their semester timetables`);
    console.log(`   ✓ Creator/Publisher workflow system`);
    console.log(`   ✓ College-specific resource isolation`);
    console.log(`   ✓ Department-level access control`);
    console.log(`   ✓ Role-based permissions (RBAC)`);
    
    console.log(`\n🤖 Algorithm Enhancements:`);
    console.log(`   ✓ Multi-college constraint handling`);
    console.log(`   ✓ Cross-college faculty sharing support`);
    console.log(`   ✓ College-specific time slot management`);
    console.log(`   ✓ Enhanced conflict detection`);
    console.log(`   ✓ Workflow-aware optimization`);
    
    console.log('\n✅ Multi-College PyGram System Ready!');
    
  } catch (error) {
    console.error('❌ Error generating summary:', error);
  }
}

// Main execution
async function main() {
  await setupMultiCollegeSchema();
  await insertCSESubjectsWithCollegeSupport();
  await createSampleData();
  await displaySystemSummary();
}

main();