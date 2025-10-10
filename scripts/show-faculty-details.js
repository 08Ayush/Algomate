const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function showFacultyDetails() {
  try {
    console.log('👥 CSE FACULTY DETAILS');
    console.log('======================\n');

    // Get all faculty 
    const { data: faculty, error: facultyError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, college_uid, role, college_id, department_id')
      .eq('role', 'faculty')
      .order('last_name');

    if (facultyError) {
      console.error('❌ Error fetching faculty:', facultyError);
      return;
    }

    console.log(`📊 Total Faculty: ${faculty.length}\n`);

    for (const fac of faculty) {
      // Get college and department names
      const { data: college } = await supabase
        .from('colleges')
        .select('name, code')
        .eq('id', fac.college_id)
        .single();

      const { data: department } = await supabase
        .from('departments')
        .select('name, code')
        .eq('id', fac.department_id)
        .single();

      console.log(`👤 ${fac.first_name} ${fac.last_name}`);
      console.log(`   📧 Email: ${fac.email}`);
      console.log(`   🆔 College ID: ${fac.college_uid}`);
      console.log(`   🏛️  College: ${college?.name || 'N/A'}`);
      console.log(`   🏢 Department: ${department?.name || 'N/A'}`);

      // Get their subject qualifications
      const { data: qualifications, error: qualError } = await supabase
        .from('faculty_qualified_subjects')
        .select(`
          proficiency_level, is_primary_teacher,
          subjects(name, code, subject_type)
        `)
        .eq('faculty_id', fac.id);

      if (!qualError && qualifications && qualifications.length > 0) {
        console.log(`   📚 Qualified Subjects (${qualifications.length}):`);
        qualifications.forEach(qual => {
          const isPrimary = qual.is_primary_teacher ? '🎯' : '📝';
          console.log(`      ${isPrimary} ${qual.subjects.name} (${qual.subjects.code}) - ${qual.subjects.subject_type}`);
          console.log(`         Proficiency: ${qual.proficiency_level}/10`);
        });
      } else {
        console.log(`   📚 Qualified Subjects: None assigned`);
      }
      console.log('');
    }

    // Get qualification statistics
    const { data: totalQuals, error: qualsError } = await supabase
      .from('faculty_qualified_subjects')
      .select('count');

    if (!qualsError) {
      console.log('📊 QUALIFICATION STATISTICS:');
      console.log('============================');
      console.log(`👥 Total Faculty: ${faculty.length}`);
      console.log(`🔗 Total Qualifications: ${totalQuals?.length || 0}`);
      console.log(`📚 Average Qualifications per Faculty: ${totalQuals?.length ? (totalQuals.length / faculty.length).toFixed(1) : 0}`);
    }

    // Test login credentials
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('======================');
    console.log('Faculty can log in using:');
    console.log('📧 Email: Their assigned email address');
    console.log('🔐 Password: password123');
    console.log('\nExample:');
    if (faculty.length > 0) {
      console.log(`📧 Email: ${faculty[0].email}`);
      console.log('🔐 Password: password123');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

showFacultyDetails();