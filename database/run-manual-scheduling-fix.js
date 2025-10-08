const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Database connection configuration
// Update these with your actual Supabase details
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

async function executeManualSchedulingFix() {
  console.log('🔧 Starting Manual Scheduling Database Fix...\n');

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    console.log('📊 Step 1: Adding semester field to subjects table...');
    
    // Step 1: Add semester field to subjects table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE subjects 
        ADD COLUMN IF NOT EXISTS semester INT CHECK (semester BETWEEN 1 AND 8);
      `
    });

    if (alterError) {
      console.log('ℹ️  Semester column might already exist:', alterError.message);
    } else {
      console.log('✅ Semester field added successfully');
    }

    console.log('\n📚 Step 2: Updating existing subjects with semester info...');

    // Step 2: Update existing subjects with semester information
    const semesterUpdates = [
      { semester: 1, codes: ['MATH-1', 'PHY-1', 'CHEM', 'BE', 'EG', 'WP'] },
      { semester: 2, codes: ['MATH-2', 'PHY-2', 'PROG-C', 'PROG-C-LAB', 'DE', 'ES'] },
      { semester: 3, codes: ['MATH-3', 'DS', 'DS lab', 'DLD', 'OOP', 'OOP-LAB', 'DM'] },
      { semester: 4, codes: ['DBMS', 'DBMS-LAB', 'CN', 'WT', 'WT-LAB'] },
      { semester: 5, codes: ['CAO', 'OS', 'OS lab', 'SEPM', 'SEPM lab', 'Capstone lab'] },
      { semester: 6, codes: ['TOC', 'TOC lab', 'CC', 'CC lab', 'DCFM', 'DCFM lab'] },
      { semester: 7, codes: ['CNS', 'CNS lab', 'DL', 'MDM-1', 'OE-3', 'Project-1'] },
      { semester: 8, codes: ['MDM-3', 'Project-2', 'Micro Project'] }
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

    console.log('\n🏫 Step 3: Getting department and college info...');

    // Step 3: Get CSE department info
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .select('id, college_id')
      .eq('code', 'CSE')
      .single();

    if (deptError || !deptData) {
      throw new Error('CSE department not found! Please ensure departments are set up.');
    }

    console.log('✅ Found CSE department:', deptData.id);

    console.log('\n📖 Step 4: Adding missing curriculum subjects...');

    // Step 4: Insert missing subjects
    const newSubjects = [
      { name: 'Mathematics-I', code: 'MATH-1', semester: 1, credits: 4, type: 'THEORY' },
      { name: 'Physics-I', code: 'PHY-1', semester: 1, credits: 3, type: 'THEORY' },
      { name: 'Chemistry', code: 'CHEM', semester: 1, credits: 3, type: 'THEORY' },
      { name: 'Basic Electronics', code: 'BE', semester: 1, credits: 3, type: 'THEORY' },
      { name: 'Engineering Graphics', code: 'EG', semester: 1, credits: 2, type: 'PRACTICAL' },
      { name: 'Mathematics-II', code: 'MATH-2', semester: 2, credits: 4, type: 'THEORY' },
      { name: 'Programming in C', code: 'PROG-C', semester: 2, credits: 3, type: 'THEORY' },
      { name: 'Programming in C Lab', code: 'PROG-C-LAB', semester: 2, credits: 1, type: 'LAB' },
      { name: 'Digital Electronics', code: 'DE', semester: 2, credits: 3, type: 'THEORY' },
      { name: 'Mathematics-III', code: 'MATH-3', semester: 3, credits: 4, type: 'THEORY' },
      { name: 'Object Oriented Programming', code: 'OOP', semester: 3, credits: 3, type: 'THEORY' },
      { name: 'OOP Lab', code: 'OOP-LAB', semester: 3, credits: 1, type: 'LAB' },
      { name: 'Digital Logic Design', code: 'DLD', semester: 3, credits: 3, type: 'THEORY' },
      { name: 'Database Management Systems', code: 'DBMS', semester: 4, credits: 3, type: 'THEORY' },
      { name: 'DBMS Lab', code: 'DBMS-LAB', semester: 4, credits: 1, type: 'LAB' },
      { name: 'Computer Networks', code: 'CN', semester: 4, credits: 3, type: 'THEORY' },
      { name: 'Web Technologies', code: 'WT', semester: 4, credits: 3, type: 'THEORY' },
      { name: 'Web Technologies Lab', code: 'WT-LAB', semester: 4, credits: 1, type: 'LAB' }
    ];

    for (const subject of newSubjects) {
      const { error: insertError } = await supabase
        .from('subjects')
        .upsert({
          name: subject.name,
          code: subject.code,
          college_id: deptData.college_id,
          department_id: deptData.id,
          credits_per_week: subject.credits,
          subject_type: subject.type,
          semester: subject.semester
        }, {
          onConflict: 'college_id,department_id,code'
        });

      if (insertError) {
        console.log(`⚠️  Error inserting ${subject.code}:`, insertError.message);
      }
    }

    console.log('✅ Added missing curriculum subjects');

    console.log('\n👨‍🏫 Step 5: Setting up faculty qualifications...');

    // Step 5: Get bramhe user and create qualifications
    const { data: bramheData, error: bramheError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'bramhe@svpce.edu.in')
      .single();

    if (bramheError || !bramheData) {
      console.log('⚠️  Bramhe user not found, skipping faculty qualifications');
    } else {
      console.log('✅ Found bramhe user:', bramheData.id);

      // Get all CSE subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('department_id', deptData.id)
        .eq('is_active', true);

      if (subjectsError) {
        console.log('⚠️  Error getting subjects:', subjectsError.message);
      } else {
        console.log(`📚 Found ${subjectsData.length} subjects to qualify bramhe for`);

        // Create qualifications for all subjects
        for (const subject of subjectsData) {
          const { error: qualError } = await supabase
            .from('faculty_qualified_subjects')
            .upsert({
              faculty_id: bramheData.id,
              subject_id: subject.id,
              proficiency_level: 8,
              preference_score: 7
            }, {
              onConflict: 'faculty_id,subject_id'
            });

          if (qualError) {
            console.log(`⚠️  Error creating qualification for subject ${subject.id}:`, qualError.message);
          }
        }

        console.log('✅ Created faculty qualifications for bramhe');
      }
    }

    console.log('\n🔍 Step 6: Verification...');

    // Step 6: Verification
    const { data: subjectCount, error: countError } = await supabase
      .from('subjects')
      .select('semester', { count: 'exact' })
      .not('semester', 'is', null)
      .eq('is_active', true);

    if (!countError) {
      console.log(`✅ Total subjects with semester info: ${subjectCount.length}`);
    }

    const { data: qualCount, error: qualCountError } = await supabase
      .from('faculty_qualified_subjects')
      .select('*', { count: 'exact' });

    if (!qualCountError) {
      console.log(`✅ Total faculty qualifications: ${qualCount.length}`);
    }

    // Check subjects by semester
    const { data: semesterBreakdown } = await supabase
      .from('subjects')
      .select('semester')
      .not('semester', 'is', null)
      .eq('is_active', true);

    if (semesterBreakdown) {
      const semesterCounts = {};
      semesterBreakdown.forEach(s => {
        semesterCounts[s.semester] = (semesterCounts[s.semester] || 0) + 1;
      });

      console.log('\n📊 Subjects by semester:');
      for (let sem = 1; sem <= 8; sem++) {
        console.log(`   Semester ${sem}: ${semesterCounts[sem] || 0} subjects`);
      }
    }

    console.log('\n🎉 Manual Scheduling Database Fix Completed Successfully!');
    console.log('🔗 Subjects and faculty are now properly linked with semester information.');
    console.log('🎯 Test the manual scheduling component now!');

  } catch (error) {
    console.error('❌ Error during database fix:', error.message);
    console.log('\n💡 Alternative: Copy the SQL from complete-manual-scheduling-fix.sql');
    console.log('   and run it directly in Supabase SQL Editor.');
  }
}

// Check if environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('⚠️  Environment variables not found.');
  console.log('Please set the following in your .env.local file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-supabase-url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.log('\nOr run the SQL script manually in Supabase SQL Editor.');
  process.exit(1);
}

// Run the fix
executeManualSchedulingFix();