const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDg3ODgsImV4cCI6MjA3NDQ4NDc4OH0.ghVoq26l_vh4cOM9Nkf2hh2AMPRDmNKZPl4zm3NRHpA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubjectsSemesterColumn() {
  console.log('🔍 Testing Subjects with Semester Column:\n');

  // Get CSE subjects with semester column
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('id, code, name, semester, subject_type, credits_per_week, is_core_subject')
    .eq('department_id', '817ba459-92f5-4a7c-ba0f-82ec6e441f9a')
    .eq('is_active', true)
    .order('semester', { ascending: true })
    .order('code', { ascending: true });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${subjects.length} CSE subjects\n`);

  // Group by semester
  const semesterGroups = {};
  for (let sem = 1; sem <= 8; sem++) {
    semesterGroups[sem] = [];
  }

  subjects.forEach(subject => {
    if (subject.semester >= 1 && subject.semester <= 8) {
      semesterGroups[subject.semester].push(subject);
    }
  });

  // Display results
  console.log('📊 Semester-wise Distribution:\n');
  
  for (let sem = 1; sem <= 8; sem++) {
    const semSubjects = semesterGroups[sem];
    const theory = semSubjects.filter(s => s.subject_type === 'THEORY').length;
    const lab = semSubjects.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length;
    
    console.log(`\n📚 Semester ${sem}: ${semSubjects.length} subjects (${theory} Theory, ${lab} Lab/Practical)`);
    
    if (semSubjects.length > 0) {
      semSubjects.forEach(s => {
        const type = s.subject_type === 'THEORY' ? '📖' : '🧪';
        console.log(`   ${type} ${s.code}: ${s.name} (${s.credits_per_week} credits)`);
      });
    } else {
      console.log('   ⚠️ No subjects assigned to this semester');
    }
  }

  // Overall statistics
  console.log('\n\n📈 Overall Statistics:');
  const totalTheory = subjects.filter(s => s.subject_type === 'THEORY').length;
  const totalLab = subjects.filter(s => s.subject_type === 'LAB' || s.subject_type === 'PRACTICAL').length;
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits_per_week, 0);
  const coreSubjects = subjects.filter(s => s.is_core_subject).length;

  console.log(`   Total Subjects: ${subjects.length}`);
  console.log(`   Theory Subjects: ${totalTheory}`);
  console.log(`   Lab/Practical Subjects: ${totalLab}`);
  console.log(`   Total Credits: ${totalCredits}`);
  console.log(`   Core Subjects: ${coreSubjects}`);
}

testSubjectsSemesterColumn().catch(console.error);
