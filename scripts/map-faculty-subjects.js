const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function mapFacultyToRealSubjects() {
  try {
    console.log('🔧 Mapping CSE Faculty to Actual Database Subjects...');
    
    // Get all CSE subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('department_id', (
        await supabase
          .from('departments')
          .select('id')
          .eq('code', 'CSE')
          .single()
      ).data.id);

    if (subjectsError) {
      console.error('❌ Error fetching subjects:', subjectsError);
      return;
    }

    // Get all faculty
    const { data: faculty, error: facultyError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('role', 'faculty');

    if (facultyError) {
      console.error('❌ Error fetching faculty:', facultyError);
      return;
    }

    console.log(`📚 Found ${subjects.length} subjects and ${faculty.length} faculty members`);

    // Define proper mappings based on actual database subject codes
    const facultySubjectMappings = [
      {
        lastName: 'Bramhe',
        subjects: ['25CE702T', '25CE702P'] // Cryptography and Network Security + Lab
      },
      {
        lastName: 'Wanjari',
        subjects: ['25CE103T', '25CE103P', '25CE203T', '25CE203P'] // Logic with C + Python
      },
      {
        lastName: 'Wajgi',
        subjects: ['25CE501T'] // Theory of Computation
      },
      {
        lastName: 'Gehani',
        subjects: ['25CE401T'] // Data Communication
      },
      {
        lastName: 'Wankhede',
        subjects: ['25CE502T', '25CE502P'] // Operating System + Lab
      },
      {
        lastName: 'Deshpande',
        subjects: ['25CE503T', '25CE504T'] // Professional Electives (SEPM could be here)
      },
      {
        lastName: 'Roychaudhary',
        subjects: ['25CE304T', '25CE702P'] // Computer Architecture + CNS Lab
      },
      {
        lastName: 'Golhar',
        subjects: ['25CE304T', '25CE401T'] // Computer Architecture + Data Communication
      },
      {
        lastName: 'Kotkondawar',
        subjects: ['25CE701T'] // Compiler Construction
      },
      {
        lastName: 'Gupta', // Aniket Gupta
        email: 'aniket.gupta@svpcet.edu.in',
        subjects: ['25CE302T', '25CE302P'] // Data Structure + Lab
      },
      {
        lastName: 'Gupta', // Dhiraj Gupta
        email: 'dhiraj.gupta@svpcet.edu.in',
        subjects: ['25CE7610'] // Open Elective-III
      },
      {
        lastName: 'Nikhare',
        subjects: ['25CE502T', '25CE502P'] // Operating System + Lab
      },
      {
        lastName: 'Bhagat',
        subjects: ['25CE302T', '25CE302P'] // Data Structure + Lab
      },
      {
        lastName: 'Korde',
        subjects: ['25CE7610', '25CE705P'] // Open Elective-III + Project-II
      },
      {
        lastName: 'Dhage',
        subjects: ['25CE501T', '25CE701T'] // Theory of Computation + Compiler Construction
      },
      {
        lastName: 'Meshram',
        subjects: ['25CE705P'] // Project-II
      },
      {
        lastName: 'Wadhwani',
        subjects: ['25CE705P', '25CE605P'] // Project-II + Project-1
      },
      {
        lastName: 'Chole',
        subjects: ['25CE702P', '25CE405P'] // CNS Lab + Mini Project
      }
    ];

    console.log('\n🔗 Creating faculty-subject qualifications...');

    const qualifications = [];
    let successCount = 0;
    let notFoundCount = 0;

    for (const mapping of facultySubjectMappings) {
      // Find faculty member
      let facultyMember;
      if (mapping.email) {
        facultyMember = faculty.find(f => f.email === mapping.email);
      } else {
        facultyMember = faculty.find(f => f.last_name === mapping.lastName);
      }

      if (!facultyMember) {
        console.log(`   ⚠️  Faculty ${mapping.lastName} not found`);
        notFoundCount++;
        continue;
      }

      console.log(`\n👤 Processing ${facultyMember.first_name} ${facultyMember.last_name}:`);

      for (const subjectCode of mapping.subjects) {
        const subject = subjects.find(s => s.code === subjectCode);
        if (subject) {
          qualifications.push({
            faculty_id: facultyMember.id,
            subject_id: subject.id,
            proficiency_level: 8,
            preference_score: 7,
            is_primary_teacher: true,
            can_handle_lab: subject.code.includes('P'),
            can_handle_tutorial: true
          });
          console.log(`   ✅ ${subject.name} (${subject.code})`);
          successCount++;
        } else {
          console.log(`   ❌ Subject ${subjectCode} not found`);
          notFoundCount++;
        }
      }
    }

    // Insert qualifications
    if (qualifications.length > 0) {
      console.log(`\n📝 Inserting ${qualifications.length} faculty qualifications...`);
      
      const { data: insertedQuals, error: qualError } = await supabase
        .from('faculty_qualified_subjects')
        .upsert(qualifications, {
          onConflict: 'faculty_id,subject_id',
          ignoreDuplicates: false
        })
        .select();

      if (qualError) {
        console.error('❌ Error inserting qualifications:', qualError);
        return;
      }

      console.log(`✅ Successfully created ${insertedQuals?.length || qualifications.length} qualifications`);
    }

    // Generate summary
    console.log('\n📊 FACULTY QUALIFICATION SUMMARY');
    console.log('=================================');
    
    for (const mapping of facultySubjectMappings) {
      let facultyMember;
      if (mapping.email) {
        facultyMember = faculty.find(f => f.email === mapping.email);
      } else {
        facultyMember = faculty.find(f => f.last_name === mapping.lastName);
      }

      if (!facultyMember) continue;

      const mappedSubjects = mapping.subjects
        .map(code => subjects.find(s => s.code === code))
        .filter(s => s);

      console.log(`\n👤 ${facultyMember.first_name} ${facultyMember.last_name}:`);
      console.log(`   📧 ${facultyMember.email}`);
      console.log(`   📚 Qualified Subjects (${mappedSubjects.length}):`);
      mappedSubjects.forEach(subject => {
        console.log(`      • ${subject.name} (${subject.code})`);
      });
    }

    console.log(`\n✅ Faculty qualification mapping completed!`);
    console.log(`📊 Total mappings created: ${successCount}`);
    console.log(`⚠️  Total not found: ${notFoundCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

mapFacultyToRealSubjects();