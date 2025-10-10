const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Please check your .env file for:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertCSESubjects() {
  try {
    console.log('🚀 Starting CSE subjects insertion...');
    
    // First, check if CSE department exists
    console.log('📋 Checking if CSE department exists...');
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('code', 'CSE')
      .single();

    if (deptError || !dept) {
      console.error('❌ CSE department not found!');
      console.error('Please create the CSE department first.');
      return;
    }

    console.log(`✅ Found CSE department: ${dept.name} (ID: ${dept.id})`);

    // Define the subjects to insert
    const subjects = [
      { name: 'Cryptography and Network Security', code: 'CNS', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Cryptography and Network Security Lab', code: 'CNS lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Deep Learning', code: 'DL', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Theory of Computation', code: 'TOC', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Theory of Computation Lab', code: 'TOC lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Data Communication and computer networks', code: 'DCFM', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Data Communication and computer networks Lab', code: 'DCFM lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Operating System', code: 'OS', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Operating System Lab', code: 'OS lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Software Engineering and Project Management', code: 'SEPM', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Software Engineering and Project Management Lab', code: 'SEPM lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Computer Architecture and Organization', code: 'CAO', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Capstone Lab', code: 'Capstone lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Compiler Construction', code: 'CC', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Compiler Construction Lab', code: 'CC lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'MDM-I', code: 'MDM-1', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Data Structure', code: 'DS', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Data Structure Lab', code: 'DS lab', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Open Elective - III', code: 'OE-3', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'MDM-III', code: 'MDM-3', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Project - II', code: 'Project-2', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'Micro Project', code: 'Micro Project', credits_per_week: 1, subject_type: 'PRACTICAL' }
    ];

    // Add department_id to each subject
    const subjectsWithDept = subjects.map(subject => ({
      ...subject,
      department_id: dept.id
    }));

    console.log(`📚 Inserting ${subjects.length} CSE subjects...`);

    // Insert subjects using upsert (insert or update if exists)
    const { data, error } = await supabase
      .from('subjects')
      .upsert(subjectsWithDept, {
        onConflict: 'department_id,code',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('❌ Error inserting subjects:', error);
      return;
    }

    console.log(`✅ Successfully inserted/updated ${data?.length || subjects.length} subjects!`);

    // Verify the insertion by fetching all CSE subjects
    console.log('🔍 Verifying inserted subjects...');
    const { data: insertedSubjects, error: fetchError } = await supabase
      .from('subjects')
      .select(`
        id,
        name,
        code,
        credits_per_week,
        subject_type,
        is_active,
        department:departments(name, code)
      `)
      .eq('department_id', dept.id)
      .order('subject_type', { ascending: true })
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching subjects:', fetchError);
      return;
    }

    console.log('\n📋 All CSE subjects in database:');
    console.log('==========================================');
    
    const groupedSubjects = insertedSubjects.reduce((acc, subject) => {
      if (!acc[subject.subject_type]) {
        acc[subject.subject_type] = [];
      }
      acc[subject.subject_type].push(subject);
      return acc;
    }, {});

    Object.keys(groupedSubjects).forEach(type => {
      console.log(`\n${type} Subjects:`);
      groupedSubjects[type].forEach(subject => {
        console.log(`  • ${subject.name} (${subject.code}) - ${subject.credits_per_week} credits/week`);
      });
    });

    console.log('\n✅ CSE subjects insertion completed successfully!');
    console.log(`📊 Total subjects: ${insertedSubjects.length}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the insertion
insertCSESubjects();