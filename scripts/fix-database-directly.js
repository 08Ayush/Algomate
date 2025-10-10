const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDg3ODgsImV4cCI6MjA3NDQ4NDc4OH0.ghVoq26l_vh4cOM9Nkf2hh2AMPRDmNKZPl4zm3NRHpA';

async function executeManualSchedulingFix() {
  console.log('🔧 Starting Manual Scheduling Database Fix...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    console.log('📊 Step 1: Adding semester field to subjects table...');
    
    // First, let's check what subjects exist
    const { data: existingSubjects, error: checkError } = await supabase
      .from('subjects')
      .select('id, name, code, semester')
      .limit(5);

    if (checkError) {
      console.error('❌ Error checking subjects:', checkError.message);
      return;
    }

    console.log('📚 Current subjects in database:', existingSubjects?.length || 0);
    if (existingSubjects && existingSubjects.length > 0) {
      console.log('Sample subjects:', existingSubjects);
    }

    // Check if semester column exists
    const { data: subjectsWithSemester } = await supabase
      .from('subjects')
      .select('semester')
      .limit(1);

    if (subjectsWithSemester && subjectsWithSemester.length > 0 && subjectsWithSemester[0].semester !== undefined) {
      console.log('✅ Semester column already exists');
    } else {
      console.log('⚠️  Semester column missing - this explains the issue!');
    }

    console.log('\n👨‍🏫 Step 2: Checking faculty and qualifications...');

    // Check faculty
    const { data: facultyData, error: facultyError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, department_id')
      .eq('role', 'faculty')
      .eq('is_active', true);

    if (facultyError) {
      console.error('❌ Error checking faculty:', facultyError.message);
    } else {
      console.log('👥 Faculty found:', facultyData?.length || 0);
      if (facultyData && facultyData.length > 0) {
        console.log('Sample faculty:', facultyData.slice(0, 2));
      }
    }

    // Check faculty qualifications
    const { data: qualifications, error: qualError } = await supabase
      .from('faculty_qualified_subjects')
      .select('*')
      .limit(5);

    if (qualError) {
      console.error('❌ Error checking qualifications:', qualError.message);
    } else {
      console.log('🎓 Faculty qualifications found:', qualifications?.length || 0);
    }

    console.log('\n🏫 Step 3: Checking department structure...');

    const { data: departments, error: deptError } = await supabase
      .from('departments')
      .select('*');

    if (deptError) {
      console.error('❌ Error checking departments:', deptError.message);
    } else {
      console.log('🏢 Departments found:', departments?.length || 0);
      if (departments && departments.length > 0) {
        console.log('Departments:', departments.map(d => `${d.name} (${d.code})`));
      }
    }

    console.log('\n🔧 Step 4: Applying fixes...');

    // Since we can't execute DDL with anon key, let's try direct updates
    if (existingSubjects && existingSubjects.length > 0) {
      console.log('Attempting to update existing subjects with semester info...');

      // Update subjects with semester information
      const semesterUpdates = [
        { codes: ['DS', 'DS lab'], semester: 3 },
        { codes: ['CNS', 'CNS lab', 'DL'], semester: 7 },
        { codes: ['TOC', 'TOC lab', 'CC', 'CC lab', 'DCFM', 'DCFM lab'], semester: 6 },
        { codes: ['CAO', 'OS', 'OS lab', 'SEPM', 'SEPM lab', 'Capstone lab'], semester: 5 },
        { codes: ['MDM-1', 'OE-3'], semester: 7 },
        { codes: ['MDM-3', 'Project-2', 'Micro Project'], semester: 8 }
      ];

      for (const update of semesterUpdates) {
        const { data, error } = await supabase
          .from('subjects')
          .update({ semester: update.semester })
          .in('code', update.codes);

        if (error) {
          console.log(`⚠️  Error updating semester ${update.semester}:`, error.message);
        } else {
          console.log(`✅ Updated semester ${update.semester} subjects`);
        }
      }
    }

    // Add missing subjects if CSE department exists
    const cseDept = departments?.find(d => d.code === 'CSE');
    if (cseDept) {
      console.log('📚 Adding missing curriculum subjects...');

      const newSubjects = [
        { name: 'Mathematics-I', code: 'MATH-1', semester: 1, credits: 4, type: 'THEORY' },
        { name: 'Mathematics-II', code: 'MATH-2', semester: 2, credits: 4, type: 'THEORY' },
        { name: 'Mathematics-III', code: 'MATH-3', semester: 3, credits: 4, type: 'THEORY' },
        { name: 'Programming in C', code: 'PROG-C', semester: 2, credits: 3, type: 'THEORY' },
        { name: 'Programming in C Lab', code: 'PROG-C-LAB', semester: 2, credits: 1, type: 'LAB' },
        { name: 'Object Oriented Programming', code: 'OOP', semester: 3, credits: 3, type: 'THEORY' },
        { name: 'OOP Lab', code: 'OOP-LAB', semester: 3, credits: 1, type: 'LAB' },
        { name: 'Database Management Systems', code: 'DBMS', semester: 4, credits: 3, type: 'THEORY' },
        { name: 'DBMS Lab', code: 'DBMS-LAB', semester: 4, credits: 1, type: 'LAB' }
      ];

      for (const subject of newSubjects) {
        const { error: insertError } = await supabase
          .from('subjects')
          .upsert({
            name: subject.name,
            code: subject.code,
            college_id: cseDept.college_id,
            department_id: cseDept.id,
            credits_per_week: subject.credits,
            subject_type: subject.type,
            semester: subject.semester,
            is_active: true
          });

        if (insertError) {
          console.log(`⚠️  Error inserting ${subject.code}:`, insertError.message);
        }
      }

      console.log('✅ Added missing curriculum subjects');
    }

    // Create faculty qualifications
    const bramhe = facultyData?.find(f => f.email === 'bramhe@svpce.edu.in');
    if (bramhe && cseDept) {
      console.log('🎓 Creating faculty qualifications for bramhe...');

      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id')
        .eq('department_id', cseDept.id)
        .eq('is_active', true);

      if (allSubjects) {
        for (const subject of allSubjects) {
          const { error: qualError } = await supabase
            .from('faculty_qualified_subjects')
            .upsert({
              faculty_id: bramhe.id,
              subject_id: subject.id,
              proficiency_level: 8,
              preference_score: 7
            });

          if (qualError) {
            console.log(`⚠️  Error creating qualification:`, qualError.message);
          }
        }
        console.log(`✅ Created qualifications for ${allSubjects.length} subjects`);
      }
    }

    console.log('\n🔍 Final verification...');

    // Final check
    const { data: finalSubjects } = await supabase
      .from('subjects')
      .select('id, name, code, semester')
      .not('semester', 'is', null)
      .eq('is_active', true);

    const { data: finalQualifications } = await supabase
      .from('faculty_qualified_subjects')
      .select('*');

    console.log(`✅ Subjects with semester info: ${finalSubjects?.length || 0}`);
    console.log(`✅ Faculty qualifications: ${finalQualifications?.length || 0}`);

    if (finalSubjects && finalSubjects.length > 0) {
      const semesterCounts = {};
      finalSubjects.forEach(s => {
        semesterCounts[s.semester] = (semesterCounts[s.semester] || 0) + 1;
      });

      console.log('\n📊 Subjects by semester:');
      for (let sem = 1; sem <= 8; sem++) {
        console.log(`   Semester ${sem}: ${semesterCounts[sem] || 0} subjects`);
      }
    }

    console.log('\n🎉 Manual Scheduling Fix Attempt Completed!');
    console.log('🔄 Refresh your manual scheduling page to test the changes.');

  } catch (error) {
    console.error('❌ Error during database fix:', error.message);
    console.log('\n💡 If this fails, you need to run the SQL directly in Supabase SQL Editor.');
    console.log('📋 Copy the content from: database/complete-manual-scheduling-fix.sql');
  }
}

// Run the fix
executeManualSchedulingFix();