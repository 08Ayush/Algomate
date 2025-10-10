const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function showAvailableSubjects() {
  try {
    console.log('📚 AVAILABLE CSE SUBJECTS IN DATABASE');
    console.log('=====================================\n');

    // Get CSE subjects
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('id, name, code, subject_type, credits_per_week')
      .eq('department_id', (
        await supabase
          .from('departments')
          .select('id')
          .eq('code', 'CSE')
          .single()
      ).data.id)
      .order('code');

    if (error) {
      console.error('❌ Error fetching subjects:', error);
      return;
    }

    // Group by semester
    const semesters = {
      'Semester 1': subjects.filter(s => s.code.includes('101') || s.code.includes('10')),
      'Semester 2': subjects.filter(s => s.code.includes('201') || s.code.includes('20')),
      'Semester 3': subjects.filter(s => s.code.includes('301') || s.code.includes('30')),
      'Semester 4': subjects.filter(s => s.code.includes('401') || s.code.includes('40')),
      'Semester 5': subjects.filter(s => s.code.includes('501') || s.code.includes('50')),
      'Semester 6': subjects.filter(s => s.code.includes('601') || s.code.includes('60')),
      'Semester 7': subjects.filter(s => s.code.includes('701') || s.code.includes('70')),
      'Semester 8': subjects.filter(s => s.code.includes('801') || s.code.includes('80'))
    };

    Object.entries(semesters).forEach(([semester, semSubjects]) => {
      if (semSubjects.length > 0) {
        console.log(`${semester} (${semSubjects.length} subjects):`);
        semSubjects.forEach(subject => {
          console.log(`   • ${subject.name} (${subject.code}) - ${subject.subject_type} - ${subject.credits_per_week} credits`);
        });
        console.log('');
      }
    });

    // Suggest subject mapping for faculty
    console.log('🔧 SUGGESTED SUBJECT MAPPING FOR FACULTY');
    console.log('=========================================\n');

    const subjectMappings = {
      'CNS': 'Cryptography and Network Security (25CE702T)',
      'DL': 'Logic building with C (25CE103T) or Problem Solving with Python (25CE203T)',
      'TOC': 'Theory of Computation (25CE501T)',
      'DCFM': 'Data Communication (25CE401T)',
      'OS': 'Operating System (25CE502T)',
      'SEPM': 'Could be mapped to Professional Electives',
      'CAO': 'Computer Architecture (25CE304T)',
      'CC': 'Compiler Construction (25CE701T)',
      'DS': 'Data Structure (25CE302T)',
      'OE-3': 'Open Elective- III (25CE7610)',
      'MDM-1': 'MDM-I (Essentials of computing Systems) (25CE331M)',
      'MDM-3': 'MDM-III (Introduction to Business Management) (25CE531M)',
      'Project-2': 'Project - II (25CE705P)',
      'Micro Project': 'Mini Project II (25CE405P)'
    };

    Object.entries(subjectMappings).forEach(([shortCode, fullName]) => {
      console.log(`${shortCode} → ${fullName}`);
    });

    console.log('\n💡 Lab subjects can be mapped by adding "Lab" to the corresponding theory subject');
    console.log('💡 Some subjects might need manual assignment based on faculty expertise');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

showAvailableSubjects();