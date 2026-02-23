const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
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

async function deployMultiCollegeSchema() {
  try {
    console.log('🚀 Starting Multi-College Schema Deployment to Supabase...');
    console.log('===============================================');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'new_schema.sql');
    console.log(`📂 Reading schema from: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found: ${schemaPath}`);
      return;
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log(`✅ Schema file loaded (${schemaSQL.length} characters)`);
    
    // Split the schema into manageable chunks
    // We'll split by major sections to handle large schema
    const sqlStatements = schemaSQL
      .split(/;[\s]*(?=(?:[^']*'[^']*')*[^']*$)/g) // Split by semicolons not inside quotes
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== '');
    
    console.log(`📝 Found ${sqlStatements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log('\n🔄 Executing schema statements...');
    console.log('==========================================');
    
    // Execute statements one by one for better error tracking
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      
      // Skip empty statements or comments
      if (statement.length < 5 || statement.startsWith('--')) {
        continue;
      }
      
      try {
        // Show progress
        if (i % 10 === 0 || statement.toLowerCase().includes('create table')) {
          const progress = Math.round((i / sqlStatements.length) * 100);
          console.log(`⏳ Progress: ${progress}% (${i}/${sqlStatements.length})`);
          
          if (statement.toLowerCase().includes('create table')) {
            const tableMatch = statement.match(/create table\s+(\w+)/i);
            if (tableMatch) {
              console.log(`  📋 Creating table: ${tableMatch[1]}`);
            }
          }
        }
        
        // Execute the statement using raw SQL
        const { error } = await supabase.rpc('exec_sql', { 
          sql_statement: statement 
        });
        
        if (error) {
          // If RPC doesn't exist, try direct execution
          if (error.message.includes('function exec_sql')) {
            // For tables, indexes, and other DDL operations
            if (statement.toLowerCase().includes('create') || 
                statement.toLowerCase().includes('alter') ||
                statement.toLowerCase().includes('insert')) {
              
              // Try to execute using supabase-js query method
              const result = await supabase.from('_temp_').select('*').limit(0);
              // This is a workaround - we'll need to use the SQL editor in Supabase dashboard
              console.log(`⚠️  Statement ${i + 1} needs manual execution in Supabase SQL editor`);
              continue;
            }
          } else {
            throw error;
          }
        }
        
        successCount++;
        
      } catch (error) {
        errorCount++;
        const errorInfo = {
          statementIndex: i + 1,
          statement: statement.substring(0, 100) + (statement.length > 100 ? '...' : ''),
          error: error.message
        };
        errors.push(errorInfo);
        
        // Log critical errors immediately
        if (statement.toLowerCase().includes('create table') || 
            statement.toLowerCase().includes('create type')) {
          console.error(`❌ Critical error in statement ${i + 1}:`);
          console.error(`   SQL: ${errorInfo.statement}`);
          console.error(`   Error: ${error.message}`);
        }
      }
      
      // Small delay to avoid overwhelming the database
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n📊 SCHEMA DEPLOYMENT SUMMARY');
    console.log('==========================================');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    console.log(`📝 Total statements processed: ${sqlStatements.length}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      console.log('==========================================');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. Statement ${error.statementIndex}:`);
        console.log(`   SQL: ${error.statement}`);
        console.log(`   Error: ${error.error}`);
        console.log('');
      });
      
      console.log('\n📋 MANUAL EXECUTION REQUIRED:');
      console.log('==========================================');
      console.log('Due to Supabase limitations, you need to manually execute the schema in the Supabase dashboard:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of database/new_schema.sql');
      console.log('4. Execute the entire schema as one operation');
      console.log('');
      console.log('This will ensure all tables, constraints, and relationships are created properly.');
    }
    
    // Try to verify some basic tables were created
    console.log('\n🔍 Verifying schema deployment...');
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%college%');
      
      if (!tablesError && tables && tables.length > 0) {
        console.log('✅ Multi-college tables detected in database');
        tables.forEach(table => {
          console.log(`  📋 Found: ${table.table_name}`);
        });
      } else {
        console.log('⚠️  Unable to verify table creation automatically');
      }
    } catch (verifyError) {
      console.log('⚠️  Schema verification skipped due to access limitations');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('==========================================');
    console.log('1. Manually execute the schema in Supabase SQL Editor if needed');
    console.log('2. Run the multi-college setup script:');
    console.log('   node setup-multi-college-system.js');
    console.log('3. Insert CSE curriculum for all colleges:');
    console.log('   node insert-full-cse-curriculum.js');
    console.log('4. Verify the system is working correctly');
    
    console.log('\n✅ Schema deployment process completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error during schema deployment:', error);
    console.error('\n📋 FALLBACK SOLUTION:');
    console.error('Execute the schema manually in Supabase SQL Editor:');
    console.error('1. Copy all contents from database/new_schema.sql');
    console.error('2. Paste into Supabase SQL Editor');
    console.error('3. Execute as a single operation');
  }
}

// Run the deployment
deployMultiCollegeSchema();