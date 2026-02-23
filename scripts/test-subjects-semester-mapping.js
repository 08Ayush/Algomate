const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDg3ODgsImV4cCI6MjA3NDQ4NDc4OH0.ghVoq26l_vh4cOM9Nkf2hh2AMPRDmNKZPl4zm3NRHpA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubjectSemesterMapping() {
  console.log('🔍 Testing Subject-Semester Mapping...\n');

  // 1. Get CSE Department
  console.log('1️⃣ Getting CSE Department...');
  const { data: deptData, error: deptError } = await supabase
    .from('departments')
    .select('id, name, code')
    .eq('code', 'CSE')
    .single();

  if (deptError) {
    console.error('❌ Error fetching department:', deptError);
    return;
  }

  console.log('✅ CSE Department:', deptData);
  const deptId = deptData.id;

  // 2. Get all CSE subjects
  console.log('\n2️⃣ Getting CSE Subjects...');
  const { data: subjectsData, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name, code, credits_per_week, is_core_subject, requires_lab')
    .eq('department_id', deptId)
    .eq('is_active', true)
    .order('code');

  if (subjectsError) {
    console.error('❌ Error fetching subjects:', subjectsError);
    return;
  }

  console.log(`✅ Found ${subjectsData?.length || 0} CSE subjects`);

  // 3. Get all CSE batches with semesters
  console.log('\n3️⃣ Getting CSE Batches...');
  const { data: batchesData, error: batchesError } = await supabase
    .from('batches')
    .select('id, name, semester, section, academic_year')
    .eq('department_id', deptId)
    .eq('is_active', true)
    .order('semester');

  if (batchesError) {
    console.error('❌ Error fetching batches:', batchesError);
    return;
  }

  console.log(`✅ Found ${batchesData?.length || 0} CSE batches`);
  batchesData?.forEach(batch => {
    console.log(`   - Sem ${batch.semester} ${batch.section}: ${batch.name}`);
  });

  // 4. Get batch-subject mappings
  console.log('\n4️⃣ Getting Batch-Subject Mappings...');
  const batchIds = batchesData?.map(b => b.id) || [];
  const subjectIds = subjectsData?.map(s => s.id) || [];

  if (batchIds.length === 0) {
    console.log('⚠️ No batches found - cannot map subjects to semesters');
    console.log('💡 You need to create batches and link them to subjects using batch_subjects table');
    return;
  }

  const { data: batchSubjectsData, error: bsError } = await supabase
    .from('batch_subjects')
    .select(`
      subject_id,
      batch_id,
      required_hours_per_week,
      is_mandatory,
      batch:batches!batch_subjects_batch_id_fkey(id, semester, section)
    `)
    .in('batch_id', batchIds)
    .in('subject_id', subjectIds);

  if (bsError) {
    console.error('❌ Error fetching batch-subjects:', bsError);
    return;
  }

  console.log(`✅ Found ${batchSubjectsData?.length || 0} batch-subject mappings`);

  if (!batchSubjectsData || batchSubjectsData.length === 0) {
    console.log('\n⚠️ WARNING: No batch-subject mappings found!');
    console.log('📋 This means subjects are not linked to any batches/semesters yet.');
    console.log('\n💡 To fix this, you need to:');
    console.log('   1. Create batches for each semester (1-8) in the CSE department');
    console.log('   2. Insert records in batch_subjects table linking batches to subjects');
    console.log('\nExample SQL:');
    console.log(`
-- Create a batch for Semester 1
INSERT INTO batches (name, college_id, department_id, semester, academic_year, section)
VALUES ('CSE 2025 Sem 1 A', '<college_id>', '${deptId}', 1, '2025-26', 'A');

-- Link subjects to this batch
INSERT INTO batch_subjects (batch_id, subject_id, required_hours_per_week)
SELECT '<batch_id>', id, 4
FROM subjects
WHERE department_id = '${deptId}' AND code LIKE '%1%'; -- Adjust filter for sem 1 subjects
`);
    return;
  }

  // 5. Group subjects by semester
  console.log('\n5️⃣ Grouping Subjects by Semester...');
  const semesterMap = {};

  // Initialize semesters 1-8
  for (let sem = 1; sem <= 8; sem++) {
    semesterMap[sem] = [];
  }

  // Build subject-to-semesters mapping
  const subjectSemesterMap = {};
  batchSubjectsData.forEach(bs => {
    const subjectId = bs.subject_id;
    const semester = bs.batch?.semester;
    
    if (!subjectSemesterMap[subjectId]) {
      subjectSemesterMap[subjectId] = new Set();
    }
    if (semester) {
      subjectSemesterMap[subjectId].add(semester);
    }
  });

  // Add subjects to semester groups
  subjectsData?.forEach(subject => {
    const semesters = subjectSemesterMap[subject.id] ? Array.from(subjectSemesterMap[subject.id]).sort() : [];
    
    semesters.forEach(sem => {
      if (sem >= 1 && sem <= 8) {
        semesterMap[sem].push({
          ...subject,
          semesters: semesters
        });
      }
    });
  });

  // 6. Display results
  console.log('\n6️⃣ Subject Distribution by Semester:\n');
  for (let sem = 1; sem <= 8; sem++) {
    const subjects = semesterMap[sem];
    console.log(`📚 Semester ${sem}: ${subjects.length} subjects`);
    
    if (subjects.length > 0) {
      subjects.forEach(subject => {
        const category = subject.is_core_subject ? 'BSC' : 'Elective';
        const type = subject.requires_lab ? 'Lab' : 'Theory';
        console.log(`   - ${subject.code}: ${subject.name} (${category}, ${type}, ${subject.credits_per_week} credits)`);
      });
    }
    console.log('');
  }

  // 7. Summary
  console.log('\n📊 Summary:');
  const totalMapped = Object.values(semesterMap).reduce((sum, arr) => sum + arr.length, 0);
  const unmappedSubjects = subjectsData.filter(s => !subjectSemesterMap[s.id]);
  
  console.log(`✅ Total subjects: ${subjectsData.length}`);
  console.log(`✅ Mapped to semesters: ${Object.keys(subjectSemesterMap).length}`);
  console.log(`⚠️ Unmapped subjects: ${unmappedSubjects.length}`);
  
  if (unmappedSubjects.length > 0) {
    console.log('\n⚠️ Unmapped subjects:');
    unmappedSubjects.forEach(s => {
      console.log(`   - ${s.code}: ${s.name}`);
    });
  }
}

testSubjectSemesterMapping().catch(console.error);
