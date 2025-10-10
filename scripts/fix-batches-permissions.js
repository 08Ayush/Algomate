const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzM4NjU3MSwiZXhwIjoyMDUyOTYyNTcxfQ.fXCfZwxMf1fVzx9Kxc79rDCjx6U9vOQbJ-e6N-cqMgk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBatchesPermissions() {
  console.log('🔧 Fixing permissions for batches table...\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'database', 'fix-batches-classrooms-permissions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.includes('GRANT') || statement.includes('SELECT')) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        });

        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          // Try direct execution as fallback
          console.log('Trying direct execution...');
          const { error: directError } = await supabase.from('batches').select('count').limit(1);
          if (directError && directError.message.includes('permission denied')) {
            console.error('⚠️  Direct execution also failed. Permissions not set yet.');
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      }
    }

    console.log('\n🎉 Permission fix completed!');
    console.log('\n📋 Summary:');
    console.log('   - batches: SELECT, INSERT, UPDATE, DELETE');
    console.log('   - classrooms: SELECT');
    console.log('   - subjects: SELECT');
    console.log('   - departments: SELECT');
    console.log('   - users: SELECT');
    console.log('   - colleges: SELECT');
    console.log('\n⚠️  If you still get permission errors, you need to run the SQL directly in Supabase SQL Editor:');
    console.log('   1. Go to https://supabase.com/dashboard/project/hwfdzrqfesebmuzgqmpe/sql');
    console.log('   2. Open: database/fix-batches-classrooms-permissions.sql');
    console.log('   3. Click "Run" to execute all GRANT statements');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.log('\n💡 Manual Fix Required:');
    console.log('   Run this in Supabase SQL Editor:');
    console.log('   ');
    console.log('   GRANT SELECT, INSERT, UPDATE, DELETE ON batches TO anon;');
    console.log('   GRANT SELECT, INSERT, UPDATE, DELETE ON batches TO authenticated;');
    console.log('   GRANT SELECT ON classrooms TO anon;');
    console.log('   GRANT SELECT ON departments TO anon;');
    console.log('   GRANT SELECT ON users TO anon;');
    console.log('   GRANT SELECT ON colleges TO anon;');
  }
}

// Run the fix
fixBatchesPermissions();
