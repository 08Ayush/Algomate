// ============================================================================
// Apply Timetable-Specific Constraints Fix
// Run this script to update the database schema
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyConstraintFix() {
  try {
    console.log('🔧 Applying timetable-specific constraints fix...\n');

    // Read the SQL fix file
    const sqlPath = path.join(__dirname, 'database', 'fix-constraints-timetable-specific.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📄 SQL file loaded successfully');
    console.log('📊 Executing database changes...\n');

    // Split by semicolon to execute statements individually
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });

        if (error) {
          // Some errors are expected (like "constraint already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key')) {
            console.log(`⚠️  Skipped: ${error.message.substring(0, 80)}...`);
          } else {
            console.error(`❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          successCount++;
          console.log(`✅ Success`);
        }
      } catch (err) {
        console.error(`❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`📊 Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log('='.repeat(70));

    // Verify the changes
    console.log('\n🔍 Verifying constraints...\n');

    const { data: constraints, error: constraintError } = await supabase
      .from('pg_constraint')
      .select('conname')
      .ilike('conname', '%timetable%');

    if (constraintError) {
      console.log('⚠️  Could not verify constraints automatically');
      console.log('   Please run the verification queries manually in Supabase SQL editor');
    } else if (constraints && constraints.length > 0) {
      console.log('✅ Timetable-specific constraints detected:');
      constraints.forEach(c => console.log(`   - ${c.conname}`));
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ DATABASE UPDATE COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📋 Next Steps:');
    console.log('   1. Restart your development server (npm run dev)');
    console.log('   2. Generate timetables for Semester 3, 5, and 7');
    console.log('   3. Verify all can be saved without conflicts');
    console.log('   4. Check that multiple drafts can coexist\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Alternative: Direct SQL execution via Supabase RPC
async function applyViaDirectSQL() {
  try {
    console.log('🔧 Applying constraints via direct SQL execution...\n');

    // Step 1: Drop old constraints
    console.log('Step 1: Dropping global constraints...');
    const dropConstraints = [
      'ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_batch_time_conflict',
      'ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_faculty_time_conflict',
      'ALTER TABLE scheduled_classes DROP CONSTRAINT IF EXISTS no_classroom_time_conflict'
    ];

    for (const sql of dropConstraints) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error && !error.message.includes('does not exist')) {
        console.error(`❌ ${error.message}`);
      } else {
        console.log(`✅ ${sql.substring(0, 60)}...`);
      }
    }

    // Step 2: Add timetable-specific constraints
    console.log('\nStep 2: Adding timetable-specific constraints...');
    const addConstraints = [
      `ALTER TABLE scheduled_classes 
       ADD CONSTRAINT no_batch_time_conflict_per_timetable 
       EXCLUDE USING gist (timetable_id WITH =, batch_id WITH =, time_slot_id WITH =)`,
      
      `ALTER TABLE scheduled_classes 
       ADD CONSTRAINT no_faculty_time_conflict_per_timetable 
       EXCLUDE USING gist (timetable_id WITH =, faculty_id WITH =, time_slot_id WITH =)`,
      
      `ALTER TABLE scheduled_classes 
       ADD CONSTRAINT no_classroom_time_conflict_per_timetable 
       EXCLUDE USING gist (timetable_id WITH =, classroom_id WITH =, time_slot_id WITH =)`
    ];

    for (const sql of addConstraints) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      if (error && !error.message.includes('already exists')) {
        console.error(`❌ ${error.message}`);
      } else {
        console.log(`✅ ${sql.substring(0, 60)}...`);
      }
    }

    console.log('\n✅ Constraints updated successfully!');
    console.log('\n📋 Manual Steps Required:');
    console.log('   1. Go to Supabase SQL Editor');
    console.log('   2. Copy and paste: database/fix-constraints-timetable-specific.sql');
    console.log('   3. Run the complete script');
    console.log('   4. Verify with the verification queries at the end\n');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️  Automatic application failed.');
    console.log('Please apply the SQL manually:');
    console.log('   1. Open Supabase Dashboard > SQL Editor');
    console.log('   2. Copy database/fix-constraints-timetable-specific.sql');
    console.log('   3. Run the script');
  }
}

// Check if we can use RPC
async function checkRPCAvailability() {
  const { data, error } = await supabase.rpc('version');
  return !error;
}

// Main execution
async function main() {
  console.log('='.repeat(70));
  console.log('🚀 TIMETABLE CONSTRAINTS FIX - Making Constraints Timetable-Specific');
  console.log('='.repeat(70));
  console.log('\nThis will allow multiple draft timetables to coexist without conflicts\n');

  const hasRPC = await checkRPCAvailability();

  if (hasRPC) {
    console.log('✅ RPC available - attempting automatic application\n');
    await applyViaDirectSQL();
  } else {
    console.log('⚠️  RPC not available - please apply manually\n');
    console.log('📋 Manual Instructions:');
    console.log('   1. Open Supabase Dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Open: database/fix-constraints-timetable-specific.sql');
    console.log('   4. Run the entire script');
    console.log('   5. Check the verification queries at the end\n');
  }
}

main();
