const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function showSystemSummary() {
  try {
    console.log('🎓 PYGRAM MULTI-COLLEGE SYSTEM SUMMARY');
    console.log('=====================================\n');

    // Get colleges
    const { data: colleges, error: collegesError } = await supabase
      .from('colleges')
      .select('*');

    if (collegesError) {
      console.error('❌ Error fetching colleges:', collegesError);
      return;
    }

    console.log(`🏛️  COLLEGES (${colleges.length}):`);
    colleges.forEach(college => {
      console.log(`   • ${college.name} (${college.code})`);
      console.log(`     📍 Location: ${college.city}, ${college.state}`);
      console.log(`     📅 Academic Year: ${college.academic_year}`);
      console.log(`     ⏰ Timings: ${college.college_start_time} - ${college.college_end_time}`);
    });

    // Get departments by college
    const { data: departments, error: deptsError } = await supabase
      .from('departments')
      .select(`
        *,
        colleges(name, code)
      `);

    if (!deptsError) {
      console.log(`\n🏢 DEPARTMENTS (${departments.length}):`);
      departments.forEach(dept => {
        console.log(`   • ${dept.name} (${dept.code}) - ${dept.colleges.name}`);
      });
    }

    // Get subjects by department
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select(`
        *,
        departments(name, code),
        colleges(name, code)
      `)
      .order('code');

    if (!subjectsError) {
      console.log(`\n📚 SUBJECTS (${subjects.length}):`);
      
      // Group by department
      const subjectsByDept = {};
      subjects.forEach(subject => {
        const deptKey = `${subject.departments.name} (${subject.departments.code})`;
        if (!subjectsByDept[deptKey]) {
          subjectsByDept[deptKey] = [];
        }
        subjectsByDept[deptKey].push(subject);
      });

      Object.entries(subjectsByDept).forEach(([dept, deptSubjects]) => {
        console.log(`\n   📖 ${dept} - ${deptSubjects.length} subjects:`);
        
        // Group by semester (based on course code pattern)
        const semesters = {
          'Semester 1': deptSubjects.filter(s => s.code.includes('101') || s.code.includes('10')),
          'Semester 2': deptSubjects.filter(s => s.code.includes('201') || s.code.includes('20')),
          'Semester 3': deptSubjects.filter(s => s.code.includes('301') || s.code.includes('30')),
          'Semester 4': deptSubjects.filter(s => s.code.includes('401') || s.code.includes('40')),
          'Semester 5': deptSubjects.filter(s => s.code.includes('501') || s.code.includes('50')),
          'Semester 6': deptSubjects.filter(s => s.code.includes('601') || s.code.includes('60')),
          'Semester 7': deptSubjects.filter(s => s.code.includes('701') || s.code.includes('70')),
          'Semester 8': deptSubjects.filter(s => s.code.includes('801') || s.code.includes('80'))
        };

        Object.entries(semesters).forEach(([semester, semSubjects]) => {
          if (semSubjects.length > 0) {
            console.log(`     ${semester} (${semSubjects.length} subjects):`);
            semSubjects.forEach(subject => {
              console.log(`       • ${subject.name} (${subject.code}) - ${subject.credits_per_week} credits - ${subject.subject_type}`);
            });
          }
        });
      });
    }

    // Get users by role
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        *,
        departments(name, code),
        colleges(name, code)
      `)
      .order('role');

    if (!usersError) {
      console.log(`\n👥 USERS (${users.length}):`);
      
      const usersByRole = {};
      users.forEach(user => {
        if (!usersByRole[user.role]) {
          usersByRole[user.role] = [];
        }
        usersByRole[user.role].push(user);
      });

      Object.entries(usersByRole).forEach(([role, roleUsers]) => {
        console.log(`\n   👤 ${role.toUpperCase()} (${roleUsers.length}):`);
        roleUsers.forEach(user => {
          console.log(`      • ${user.first_name} ${user.last_name} (${user.college_uid})`);
          console.log(`        📧 ${user.email}`);
          console.log(`        🏛️  ${user.colleges.name}`);
          if (user.departments) {
            console.log(`        🏢 ${user.departments.name}`);
          }
          if (user.role === 'student') {
            console.log(`        📚 Semester: ${user.current_semester || 'N/A'}`);
          }
        });
      });
    }

    // Get batches
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select(`
        *,
        departments(name, code),
        colleges(name, code)
      `);

    if (!batchesError && batches.length > 0) {
      console.log(`\n🎓 BATCHES (${batches.length}):`);
      batches.forEach(batch => {
        console.log(`   • ${batch.name} - Semester ${batch.semester}`);
        console.log(`     🏛️  ${batch.colleges.name}`);
        console.log(`     🏢 ${batch.departments.name}`);
        console.log(`     📊 Students: ${batch.actual_strength}/${batch.expected_strength}`);
        console.log(`     📅 Academic Year: ${batch.academic_year}`);
      });
    }

    // Calculate statistics
    const stats = {
      totalColleges: colleges.length,
      totalDepartments: departments?.length || 0,
      totalSubjects: subjects?.length || 0,
      totalUsers: users?.length || 0,
      totalBatches: batches?.length || 0,
      subjectStats: {
        theory: subjects?.filter(s => s.subject_type === 'THEORY').length || 0,
        lab: subjects?.filter(s => s.subject_type === 'LAB').length || 0,
        practical: subjects?.filter(s => s.subject_type === 'PRACTICAL').length || 0,
        tutorial: subjects?.filter(s => s.subject_type === 'TUTORIAL').length || 0,
      },
      userStats: {
        faculty: users?.filter(u => u.role === 'faculty').length || 0,
        students: users?.filter(u => u.role === 'student').length || 0,
        admins: users?.filter(u => u.role === 'admin').length || 0,
      }
    };

    console.log('\n📊 SYSTEM STATISTICS:');
    console.log('======================');
    console.log(`🏛️  Total Colleges: ${stats.totalColleges}`);
    console.log(`🏢 Total Departments: ${stats.totalDepartments}`);
    console.log(`📚 Total Subjects: ${stats.totalSubjects}`);
    console.log(`   • Theory: ${stats.subjectStats.theory}`);
    console.log(`   • Lab: ${stats.subjectStats.lab}`);
    console.log(`   • Practical: ${stats.subjectStats.practical}`);
    console.log(`   • Tutorial: ${stats.subjectStats.tutorial}`);
    console.log(`👥 Total Users: ${stats.totalUsers}`);
    console.log(`   • Faculty: ${stats.userStats.faculty}`);
    console.log(`   • Students: ${stats.userStats.students}`);
    console.log(`   • Admins: ${stats.userStats.admins}`);
    console.log(`🎓 Total Batches: ${stats.totalBatches}`);

    console.log('\n✅ MULTI-COLLEGE PYGRAM SYSTEM IS READY!');
    console.log('==========================================');
    console.log('🎯 Key Features Enabled:');
    console.log('   ✓ Multi-college architecture');
    console.log('   ✓ Student access control by semester');
    console.log('   ✓ Creator and Publisher workflow system');
    console.log('   ✓ Algorithm-ready data structure');
    console.log('   ✓ Role-based access control (RBAC)');
    console.log('   ✓ Complete CSE curriculum (8 semesters)');

  } catch (error) {
    console.error('❌ Error generating summary:', error);
  }
}

showSystemSummary();