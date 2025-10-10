const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertCSEFaculty() {
  try {
    console.log('🚀 Starting CSE Faculty insertion for St. Vincent Pallotti College...');
    
    // Get St. Vincent Pallotti College and CSE department
    const { data: college, error: collegeError } = await supabase
      .from('colleges')
      .select('id, name')
      .eq('code', 'SVPCET')
      .single();

    if (collegeError || !college) {
      console.error('❌ Error: St. Vincent Pallotti College not found!', collegeError);
      return;
    }

    const { data: cseDept, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('college_id', college.id)
      .eq('code', 'CSE')
      .single();

    if (deptError || !cseDept) {
      console.error('❌ Error: CSE department not found!', deptError);
      return;
    }

    console.log(`✅ Found ${college.name} - ${cseDept.name}`);

    // Hash the password once for all faculty
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Define faculty data with their subject codes
    const facultyData = [
      {
        firstName: 'Dr.',
        lastName: 'Bramhe',
        email: 'bramhe@svpcet.edu.in',
        collegeUid: 'CSE001',
        subjects: ['CNS']
      },
      {
        firstName: 'Prof.',
        lastName: 'Wanjari',
        email: 'wanjari@svpcet.edu.in',
        collegeUid: 'CSE002',
        subjects: ['DL']
      },
      {
        firstName: 'Dr.',
        lastName: 'Wajgi',
        email: 'wajgi@svpcet.edu.in',
        collegeUid: 'CSE003',
        subjects: ['TOC', 'TOC lab']
      },
      {
        firstName: 'Prof.',
        lastName: 'Gehani',
        email: 'gehani@svpcet.edu.in',
        collegeUid: 'CSE004',
        subjects: ['DCFM lab', 'DCFM']
      },
      {
        firstName: 'Dr.',
        lastName: 'Wankhede',
        email: 'wankhede@svpcet.edu.in',
        collegeUid: 'CSE005',
        subjects: ['OS', 'OS lab']
      },
      {
        firstName: 'Prof.',
        lastName: 'Deshpande',
        email: 'deshpande@svpcet.edu.in',
        collegeUid: 'CSE006',
        subjects: ['SEPM', 'SEPM lab']
      },
      {
        firstName: 'Dr.',
        lastName: 'Roychaudhary',
        email: 'roychaudhary@svpcet.edu.in',
        collegeUid: 'CSE007',
        subjects: ['CAO', 'CNS lab', 'Capstone lab']
      },
      {
        firstName: 'Prof.',
        lastName: 'Golhar',
        email: 'golhar@svpcet.edu.in',
        collegeUid: 'CSE008',
        subjects: ['CAO', 'DCFM', 'DCFM lab']
      },
      {
        firstName: 'Dr.',
        lastName: 'Kotkondawar',
        email: 'kotkondawar@svpcet.edu.in',
        collegeUid: 'CSE009',
        subjects: ['CC', 'CC lab', 'MDM-1']
      },
      {
        firstName: 'Prof.',
        lastName: 'Gupta',
        email: 'aniket.gupta@svpcet.edu.in',
        collegeUid: 'CSE010',
        subjects: ['DS', 'DS lab']
      },
      {
        firstName: 'Dr.',
        lastName: 'Gupta',
        email: 'dhiraj.gupta@svpcet.edu.in',
        collegeUid: 'CSE011',
        subjects: ['OE-3', 'MDM-3']
      },
      {
        firstName: 'Prof.',
        lastName: 'Nikhare',
        email: 'nikhare@svpcet.edu.in',
        collegeUid: 'CSE012',
        subjects: ['OS', 'OS lab']
      },
      {
        firstName: 'Dr.',
        lastName: 'Bhagat',
        email: 'bhagat@svpcet.edu.in',
        collegeUid: 'CSE013',
        subjects: ['DS', 'DS lab']
      },
      {
        firstName: 'Prof.',
        lastName: 'Korde',
        email: 'korde@svpcet.edu.in',
        collegeUid: 'CSE014',
        subjects: ['OE-3', 'Project-2']
      },
      {
        firstName: 'Dr.',
        lastName: 'Dhage',
        email: 'dhage@svpcet.edu.in',
        collegeUid: 'CSE015',
        subjects: ['TOC', 'CC', 'CC lab']
      },
      {
        firstName: 'Prof.',
        lastName: 'Meshram',
        email: 'meshram@svpcet.edu.in',
        collegeUid: 'CSE016',
        subjects: ['MDM-1', 'Project-2']
      },
      {
        firstName: 'Dr.',
        lastName: 'Wadhwani',
        email: 'wadhwani@svpcet.edu.in',
        collegeUid: 'CSE017',
        subjects: ['Project-2']
      },
      {
        firstName: 'Prof.',
        lastName: 'Chole',
        email: 'chole@svpcet.edu.in',
        collegeUid: 'CSE018',
        subjects: ['CNS lab', 'Micro Project']
      }
    ];

    console.log(`\n👥 Inserting ${facultyData.length} faculty members...`);

    // Prepare faculty users for insertion
    const facultyUsers = facultyData.map(faculty => ({
      first_name: faculty.firstName,
      last_name: faculty.lastName,
      college_uid: faculty.collegeUid,
      email: faculty.email,
      password_hash: hashedPassword,
      college_id: college.id,
      department_id: cseDept.id,
      role: 'faculty',
      faculty_type: 'general',
      access_level: 'write',
      can_create_timetables: true,
      is_active: true,
      email_verified: true
    }));

    // Insert faculty users
    const { data: insertedFaculty, error: facultyError } = await supabase
      .from('users')
      .upsert(facultyUsers, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id, first_name, last_name, email, college_uid');

    if (facultyError) {
      console.error('❌ Error inserting faculty:', facultyError);
      return;
    }

    console.log(`✅ Successfully inserted ${insertedFaculty?.length || facultyUsers.length} faculty members`);

    // Now get all subjects to create the subject mappings
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, code, name')
      .eq('college_id', college.id)
      .eq('department_id', cseDept.id);

    if (subjectsError) {
      console.error('❌ Error fetching subjects:', subjectsError);
      return;
    }

    console.log(`\n📚 Found ${subjects.length} subjects in CSE department`);

    // Create subject mappings
    const subjectQualifications = [];
    
    for (const faculty of facultyData) {
      // Find the inserted faculty member
      const facultyUser = insertedFaculty?.find(f => f.college_uid === faculty.collegeUid) ||
                         facultyUsers.find(f => f.college_uid === faculty.collegeUid);
      
      if (!facultyUser) {
        console.log(`   ⚠️  Faculty ${faculty.lastName} not found in inserted users`);
        continue;
      }

      // Get faculty ID by email if not available in insertedFaculty
      let facultyId = facultyUser.id;
      if (!facultyId) {
        const { data: userCheck, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', faculty.email)
          .single();
        
        if (userError || !userCheck) {
          console.log(`   ⚠️  Cannot find faculty ID for ${faculty.lastName}`);
          continue;
        }
        facultyId = userCheck.id;
      }

      // Map subjects for this faculty
      for (const subjectCode of faculty.subjects) {
        const subject = subjects.find(s => s.code === subjectCode);
        if (subject) {
          subjectQualifications.push({
            faculty_id: facultyId,
            subject_id: subject.id,
            proficiency_level: 8,
            preference_score: 7,
            is_primary_teacher: true,
            can_handle_lab: true,
            can_handle_tutorial: true
          });
        } else {
          console.log(`   ⚠️  Subject '${subjectCode}' not found for ${faculty.lastName}`);
        }
      }
    }

    console.log(`\n🔗 Creating ${subjectQualifications.length} faculty-subject qualifications...`);

    // Insert faculty qualifications
    const { data: insertedQualifications, error: qualError } = await supabase
      .from('faculty_qualified_subjects')
      .upsert(subjectQualifications, {
        onConflict: 'faculty_id,subject_id',
        ignoreDuplicates: false
      })
      .select();

    if (qualError) {
      console.error('❌ Error inserting qualifications:', qualError);
      return;
    }

    console.log(`✅ Successfully created ${insertedQualifications?.length || subjectQualifications.length} qualifications`);

    // Generate summary report
    console.log('\n📋 CSE FACULTY INSERTION SUMMARY');
    console.log('=================================');
    
    for (const faculty of facultyData) {
      const matchedSubjects = faculty.subjects.filter(code => 
        subjects.find(s => s.code === code)
      );
      const unmatchedSubjects = faculty.subjects.filter(code => 
        !subjects.find(s => s.code === code)
      );

      console.log(`\n👤 ${faculty.firstName} ${faculty.lastName}:`);
      console.log(`   📧 Email: ${faculty.email}`);
      console.log(`   🆔 College ID: ${faculty.collegeUid}`);
      console.log(`   📚 Qualified Subjects (${matchedSubjects.length}):`);
      matchedSubjects.forEach(code => {
        const subject = subjects.find(s => s.code === code);
        console.log(`      • ${subject.name} (${code})`);
      });
      
      if (unmatchedSubjects.length > 0) {
        console.log(`   ⚠️  Unmatched Subject Codes (${unmatchedSubjects.length}):`);
        unmatchedSubjects.forEach(code => {
          console.log(`      • ${code} (not found in database)`);
        });
      }
    }

    console.log('\n📊 OVERALL STATISTICS:');
    console.log('========================');
    console.log(`👥 Total Faculty Inserted: ${insertedFaculty?.length || facultyUsers.length}`);
    console.log(`🔗 Total Qualifications Created: ${insertedQualifications?.length || subjectQualifications.length}`);
    console.log(`📚 Available Subjects: ${subjects.length}`);
    console.log(`🔐 Default Password: password123`);

    console.log('\n✅ CSE Faculty insertion completed successfully!');
    console.log('🔧 Faculty can now log in with their email and password: password123');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the insertion
insertCSEFaculty();