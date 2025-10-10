const { createClient } = require('@supabase/supabase-js');
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

async function insertFullCSECurriculumMultiCollege() {
  try {
    console.log('🚀 Starting Full CSE Curriculum insertion for Multi-College System...');
    
    // Get all colleges
    console.log('🎓 Fetching colleges...');
    const { data: colleges, error: collegesError } = await supabase
      .from('colleges')
      .select('id, name, code')
      .order('name');

    if (collegesError) {
      console.error('❌ Error fetching colleges:', collegesError);
      return;
    }

    if (!colleges || colleges.length === 0) {
      console.error('❌ No colleges found! Please set up the multi-college schema first.');
      console.error('Run: node setup-multi-college-system.js');
      return;
    }

    console.log(`✅ Found ${colleges.length} colleges`);

    // Define the complete curriculum
    const curriculum = [
      // Semester 1
      { name: 'Engineering Chemistry', code: '25CE101T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Engineering Chemistry Lab', code: '25CE101P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Linear Algebra and Calculus', code: '25CE102T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Linear Algebra and Calculus Lab', code: '25CE102P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Logic building with C', code: '25CE103T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Logic building with C Lab', code: '25CE103P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Competitive Programming - I', code: '25CE104T', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'Concept in Computer Engineering-I', code: '25CE105T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Business Communication Skills I Lab', code: '25CE106P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Indian Knowledge Systems', code: '25CE107T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Co-curricular Courses - I', code: '25CE108T', credits_per_week: 2, subject_type: 'THEORY' },
      
      // Semester 2
      { name: 'Engineering Physics and Materials Science', code: '25CE201T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Engineering Physics and Materials Science Lab', code: '25CE201P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Statistics and Probability', code: '25CE202T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Statistics and Probability Lab', code: '25CE202P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Problem Solving with Python', code: '25CE203T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Problem Solving with Python Lab', code: '25CE203P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Competitive Programming - II', code: '25CE204T', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'Modern Web Technologies', code: '25CE205T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Business Communication Skills - II Lab', code: '25CE206P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Design Thinking', code: '25CE207T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Co-curricular Courses - II', code: '25CE208T', credits_per_week: 2, subject_type: 'THEORY' },
      
      // Semester 3
      { name: 'Mathematics for Computer Engineering', code: '25CE301T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Data Structure', code: '25CE302T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Data Structure Lab', code: '25CE302P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Digital Circuits', code: '25CE303T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Digital Circuits Lab', code: '25CE303P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Computer Architecture', code: '25CE304T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Computer Lab-I', code: '25CE305P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Constitution of India', code: '25ES301T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Fundamentals of Entrepreneurship', code: '25ES302T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Career Development - I', code: '25CE341P', credits_per_week: 1, subject_type: 'PRACTICAL' },
      { name: 'MDM-I (Essentials of computing Systems)', code: '25CE331M', credits_per_week: 2, subject_type: 'THEORY' },
      
      // Semester 4
      { name: 'Data Communication', code: '25CE401T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Database Management System', code: '25CE402T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Database Management System Lab', code: '25CE402P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Object Oriented Programming', code: '25CE403T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Object Oriented Programming Lab', code: '25CE403P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Environmental Science', code: '25ES401T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Fundamentals of Economics and Management', code: '25ES402T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Career Development - II', code: '25CE441P', credits_per_week: 1, subject_type: 'PRACTICAL' },
      { name: 'Mini Project II', code: '25CE405P', credits_per_week: 1, subject_type: 'PRACTICAL' },
      { name: 'MDM-II (Indian Cyber Law)', code: '25CE431M', credits_per_week: 3, subject_type: 'THEORY' },
      
      // Semester 5
      { name: 'Theory of Computation', code: '25CE501T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Operating System', code: '25CE502T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Operating System Lab', code: '25CE502P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Professional Elective - I', code: '25CE503T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Professional Elective - II', code: '25CE504T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Technical Skill Development - I', code: '25CE505P', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'English for Engineers', code: '25CE541P', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'MDM-III (Introduction to Business Management)', code: '25CE531M', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Open Elective - I', code: '25CE5610', credits_per_week: 2, subject_type: 'THEORY' },
      
      // Semester 6
      { name: 'Design and Analysis of Algorithms', code: '25CE601T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Design and Analysis of Algorithms Lab', code: '25CE601P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Professional Elective -III', code: '25CE602T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Professional Elective -IV', code: '25CE603T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Technical Skill Development - II', code: '25CE604P', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'Project - 1', code: '25CE605P', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'MDM-IV (Financial Accounting and Analysis)', code: '25CE631M', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Open Elective -II', code: '25CE6610', credits_per_week: 3, subject_type: 'THEORY' },
      
      // Semester 7
      { name: 'Compiler Construction', code: '25CE701T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Cryptography and Network Security', code: '25CE702T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Cryptography and Network Security Lab', code: '25CE702P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Professional Elective-V', code: '25CE703T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Professional Elective-VI', code: '25CE704T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Project - II', code: '25CE705P', credits_per_week: 2, subject_type: 'PRACTICAL' },
      { name: 'MDM-V (Economics and Innovation)', code: '25CE731M', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Open Elective- III', code: '25CE7610', credits_per_week: 3, subject_type: 'THEORY' },
      
      // Semester 8
      { name: 'Research Methodology', code: '25ES801T', credits_per_week: 2, subject_type: 'THEORY' },
      { name: 'Research Methodology Lab', code: '25ES801P', credits_per_week: 2, subject_type: 'LAB' },
      { name: 'Professional Elective-VII', code: '25CE802T', credits_per_week: 3, subject_type: 'THEORY' },
      { name: 'Professional Elective-VII Lab', code: '25CE802P', credits_per_week: 1, subject_type: 'LAB' },
      { name: 'Industry/Research Internship', code: '25CE803P(i)', credits_per_week: 8, subject_type: 'PRACTICAL' },
      { name: 'Institutional Internships & Project III', code: '25CE804P(i)', credits_per_week: 8, subject_type: 'PRACTICAL' }
    ];

    let totalInserted = 0;
    let collegeResults = [];

    // Process each college
    for (const college of colleges) {
      console.log(`\n🎓 Processing ${college.name} (${college.code})...`);
      
      // Check if CSE department exists for this college
      const { data: cseDept, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .eq('college_id', college.id)
        .eq('code', 'CSE')
        .single();

      if (deptError || !cseDept) {
        console.log(`   ⚠️  No CSE department found in ${college.name} - skipping`);
        collegeResults.push({
          college: college.name,
          status: 'No CSE Department',
          subjects: 0
        });
        continue;
      }

      console.log(`   ✅ Found CSE department: ${cseDept.name}`);

      // Add college and department IDs to each subject
      const curriculumWithIds = curriculum.map(subject => ({
        ...subject,
        college_id: college.id,
        department_id: cseDept.id
      }));

      console.log(`   📚 Inserting ${curriculum.length} subjects...`);

      // Insert subjects using upsert (insert or update if exists)
      const { data, error } = await supabase
        .from('subjects')
        .upsert(curriculumWithIds, {
          onConflict: 'college_id,department_id,code',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`   ❌ Error inserting curriculum for ${college.name}:`, error);
        collegeResults.push({
          college: college.name,
          status: 'Error',
          subjects: 0,
          error: error.message
        });
        continue;
      }

      const insertedCount = data?.length || curriculum.length;
      totalInserted += insertedCount;
      
      console.log(`   ✅ Successfully inserted/updated ${insertedCount} subjects`);
      collegeResults.push({
        college: college.name,
        status: 'Success',
        subjects: insertedCount
      });

      // Verify the insertion by fetching subjects for this college
      const { data: allSubjects, error: fetchError } = await supabase
        .from('subjects')
        .select('name, code, subject_type, credits_per_week')
        .eq('college_id', college.id)
        .eq('department_id', cseDept.id)
        .order('code');

      if (!fetchError && allSubjects) {
        console.log(`   📊 Total CSE subjects in ${college.name}: ${allSubjects.length}`);
      }
    }

    // Final summary
    console.log('\n📋 MULTI-COLLEGE CSE CURRICULUM INSERTION SUMMARY');
    console.log('================================================');
    
    collegeResults.forEach(result => {
      const statusIcon = result.status === 'Success' ? '✅' : 
                        result.status === 'No CSE Department' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${result.college}: ${result.status} (${result.subjects} subjects)`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    console.log(`\n📊 Overall Statistics:`);
    console.log(`Total Colleges Processed: ${colleges.length}`);
    console.log(`Successful Insertions: ${collegeResults.filter(r => r.status === 'Success').length}`);
    console.log(`Total Subjects Inserted: ${totalInserted}`);
    console.log(`Colleges without CSE: ${collegeResults.filter(r => r.status === 'No CSE Department').length}`);
    console.log(`Colleges with Errors: ${collegeResults.filter(r => r.status === 'Error').length}`);

    console.log('\n✅ Multi-College CSE curriculum insertion completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the insertion
insertFullCSECurriculumMultiCollege();