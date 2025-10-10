const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMultiCollegeSchema() {
  try {
    console.log('🔍 Verifying Multi-College Schema Deployment...');
    console.log('===============================================');
    
    // Check if key tables exist
    const expectedTables = [
      'colleges',
      'departments', 
      'users',
      'subjects',
      'classrooms',
      'batches',
      'time_slots',
      'faculty_qualified_subjects',
      'faculty_availability',
      'batch_subjects',
      'constraint_rules',
      'timetable_generation_tasks',
      'generated_timetables',
      'scheduled_classes',
      'student_batch_enrollment'
    ];
    
    let successCount = 0;
    let errors = [];
    
    for (const tableName of expectedTables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('table')) {
            errors.push(`❌ Table '${tableName}' does not exist`);
          } else {
            console.log(`✅ Table '${tableName}' exists and accessible`);
            successCount++;
          }
        } else {
          console.log(`✅ Table '${tableName}' exists and accessible`);
          successCount++;
        }
      } catch (err) {
        errors.push(`❌ Error checking table '${tableName}': ${err.message}`);
      }
    }
    
    console.log('\n📊 VERIFICATION RESULTS:');
    console.log('==========================================');
    console.log(`✅ Tables verified: ${successCount}/${expectedTables.length}`);
    console.log(`❌ Tables missing: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚨 MISSING TABLES:');
      errors.forEach(error => console.log(`  ${error}`));
      
      console.log('\n📋 ACTION REQUIRED:');
      console.log('Schema deployment is incomplete. Please:');
      console.log('1. Go to Supabase SQL Editor');
      console.log('2. Copy contents of database/new_schema.sql');
      console.log('3. Paste and execute in SQL Editor');
      console.log('4. Run this verification script again');
      
      return false;
    }
    
    // Check for sample data
    try {
      const { data: colleges, error: collegesError } = await supabase
        .from('colleges')
        .select('name, code')
        .limit(5);
      
      if (!collegesError && colleges && colleges.length > 0) {
        console.log('\n🎓 Sample Colleges Found:');
        colleges.forEach(college => {
          console.log(`  • ${college.name} (${college.code})`);
        });
      } else {
        console.log('\n⚠️  No sample colleges found - run setup script next');
      }
    } catch (err) {
      console.log('⚠️  Could not check sample data');
    }
    
    // Check for multi-college features
    try {
      const { data: depts, error: deptsError } = await supabase
        .from('departments')
        .select('name, college_id')
        .limit(3);
      
      if (!deptsError && depts && depts.length > 0) {
        console.log('\n🏢 Multi-College Structure Verified:');
        depts.forEach(dept => {
          console.log(`  • Department: ${dept.name} (College ID: ${dept.college_id})`);
        });
      }
    } catch (err) {
      console.log('⚠️  Could not verify multi-college structure');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('==========================================');
    if (successCount === expectedTables.length) {
      console.log('✅ Schema deployment successful!');
      console.log('1. Run setup script: node setup-multi-college-system.js');
      console.log('2. Insert CSE curriculum: node insert-full-cse-curriculum.js');
      console.log('3. Test the multi-college system');
    } else {
      console.log('❌ Schema deployment incomplete');
      console.log('1. Execute schema manually in Supabase SQL Editor');
      console.log('2. Run this verification script again');
    }
    
    return successCount === expectedTables.length;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

// Run verification
verifyMultiCollegeSchema();