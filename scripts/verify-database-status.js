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

async function verifyDatabaseStatus() {
  try {
    console.log('🔍 Checking database status...');
    console.log('Project URL:', supabaseUrl);
    
    // Test basic connection
    console.log('\n1️⃣ Testing basic connection...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('   ⚠️  Auth error (expected for service key):', authError.message);
    } else {
      console.log('   ✅ Connection successful');
    }

    // Check if colleges table exists
    console.log('\n2️⃣ Checking for colleges table...');
    const { data: collegesData, error: collegesError } = await supabase
      .from('colleges')
      .select('*')
      .limit(1);

    if (collegesError) {
      console.log('   ❌ Colleges table error:', collegesError.message);
      console.log('   🔧 This indicates the new schema hasn\'t been deployed yet.');
      
      // Check for old tables
      console.log('\n3️⃣ Checking for old schema tables...');
      const { data: oldDeptData, error: oldDeptError } = await supabase
        .from('departments')
        .select('*')
        .limit(1);
      
      if (oldDeptError) {
        console.log('   ❌ No departments table found:', oldDeptError.message);
        console.log('   📝 Database appears to be empty or needs schema deployment');
      } else {
        console.log('   ✅ Old departments table exists');
        console.log('   🔄 Need to deploy the new multi-college schema');
      }
    } else {
      console.log('   ✅ Colleges table exists');
      console.log(`   📊 Current colleges count: ${collegesData?.length || 0}`);
      
      // Check departments with college_id
      console.log('\n3️⃣ Checking departments with college support...');
      const { data: deptsData, error: deptsError } = await supabase
        .from('departments')
        .select('id, name, college_id')
        .limit(5);
      
      if (deptsError) {
        console.log('   ❌ Departments error:', deptsError.message);
      } else {
        console.log(`   ✅ Found ${deptsData?.length || 0} departments`);
        if (deptsData?.length > 0) {
          deptsData.forEach(dept => {
            console.log(`      • ${dept.name} (College ID: ${dept.college_id || 'NULL'})`);
          });
        }
      }
      
      // Check users table structure
      console.log('\n4️⃣ Checking users table structure...');
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, college_id, role')
        .limit(3);
      
      if (usersError) {
        console.log('   ❌ Users error:', usersError.message);
      } else {
        console.log(`   ✅ Found ${usersData?.length || 0} users`);
        if (usersData?.length > 0) {
          usersData.forEach(user => {
            console.log(`      • ${user.first_name} (Role: ${user.role}, College ID: ${user.college_id || 'NULL'})`);
          });
        }
      }
    }

    // Check current table structure
    console.log('\n5️⃣ Checking available tables...');
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_schema_tables')
      .then(() => ({ data: 'Function available', error: null }))
      .catch(err => ({ data: null, error: err }));

    if (tablesError) {
      console.log('   ⚠️  Custom function not available, using alternative check...');
      
      // Try to list some expected tables
      const tablesToCheck = ['colleges', 'departments', 'users', 'subjects', 'batches'];
      
      for (const table of tablesToCheck) {
        try {
          const { error } = await supabase.from(table).select('*').limit(1);
          if (error) {
            console.log(`   ❌ ${table}: ${error.message}`);
          } else {
            console.log(`   ✅ ${table}: Table exists`);
          }
        } catch (err) {
          console.log(`   ❌ ${table}: ${err.message}`);
        }
      }
    }

    console.log('\n📋 DIAGNOSIS:');
    console.log('==============');
    
    if (collegesError?.message?.includes('permission denied')) {
      console.log('🔧 SOLUTION: Deploy the new schema first');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Copy contents of database/new_schema.sql');
      console.log('   3. Paste and run in SQL Editor');
      console.log('   4. Then run this verification script again');
    } else if (collegesError?.message?.includes('does not exist')) {
      console.log('🔧 SOLUTION: Schema not deployed');
      console.log('   1. Deploy database/new_schema.sql in Supabase');
      console.log('   2. Run setup-multi-college-system.js');
      console.log('   3. Run insert-full-cse-curriculum.js');
    } else if (!collegesError) {
      console.log('✅ Schema appears to be deployed');
      console.log('🎯 NEXT STEPS:');
      console.log('   1. Run: node setup-multi-college-system.js');
      console.log('   2. Run: node insert-full-cse-curriculum.js');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the verification
verifyDatabaseStatus();