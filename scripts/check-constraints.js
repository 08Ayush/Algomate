// ============================================================================
// Check Current Database Constraints
// Run this to see what constraints are currently in place
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  console.log('='.repeat(70));
  console.log('DATABASE CONSTRAINTS CHECKER');
  console.log('='.repeat(70));
  console.log();

  try {
    // Check timetables
    console.log('📊 Checking timetables...');
    const { data: timetables, error: ttError } = await supabase
      .from('generated_timetables')
      .select('id, title, semester, status, created_at')
      .order('semester', { ascending: true });

    if (ttError) {
      console.error('❌ Error fetching timetables:', ttError.message);
    } else {
      console.log(`\nFound ${timetables?.length || 0} timetables:\n`);
      timetables?.forEach((tt, idx) => {
        console.log(`  ${idx + 1}. Semester ${tt.semester} - ${tt.status}`);
        console.log(`     ID: ${tt.id}`);
        console.log(`     Title: ${tt.title}`);
        console.log(`     Created: ${new Date(tt.created_at).toLocaleString()}`);
        console.log();
      });
    }

    // Check scheduled classes count per timetable
    console.log('📚 Checking scheduled classes...');
    for (const tt of timetables || []) {
      const { data: classes, error: classError } = await supabase
        .from('scheduled_classes')
        .select('id', { count: 'exact' })
        .eq('timetable_id', tt.id);

      if (!classError) {
        console.log(`  Semester ${tt.semester}: ${classes?.length || 0} classes`);
      }
    }
    console.log();

    // Check for conflicts
    console.log('🔍 Checking for potential conflicts...');
    
    const { data: facultyConflicts, error: fcError } = await supabase
      .from('scheduled_classes')
      .select(`
        faculty_id,
        time_slot_id,
        timetable_id,
        generated_timetables!inner(semester, status)
      `);

    if (!fcError && facultyConflicts) {
      const conflictMap = new Map();
      
      facultyConflicts.forEach(sc => {
        const key = `${sc.faculty_id}-${sc.time_slot_id}`;
        if (!conflictMap.has(key)) {
          conflictMap.set(key, []);
        }
        conflictMap.get(key).push({
          timetable_id: sc.timetable_id,
          semester: sc.generated_timetables.semester,
          status: sc.generated_timetables.status
        });
      });

      const conflicts = Array.from(conflictMap.values())
        .filter(list => list.length > 1);

      if (conflicts.length > 0) {
        console.log(`\n⚠️  Found ${conflicts.length} faculty-time conflicts across timetables:`);
        conflicts.slice(0, 5).forEach((conflict, idx) => {
          console.log(`\n  Conflict ${idx + 1}:`);
          conflict.forEach(c => {
            console.log(`    - Semester ${c.semester} (${c.status})`);
          });
        });
        
        if (conflicts.length > 5) {
          console.log(`\n  ... and ${conflicts.length - 5} more conflicts`);
        }
        
        console.log('\n  🔧 These conflicts will be resolved by applying the fix!');
      } else {
        console.log('  ✅ No faculty conflicts detected');
      }
    }

    console.log();
    console.log('='.repeat(70));
    console.log('CONSTRAINT STATUS');
    console.log('='.repeat(70));
    console.log();

    // Try to detect constraint type by attempting a query
    console.log('🔍 Detecting constraint type...\n');

    const { data: constraints } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name')
      .eq('table_name', 'scheduled_classes')
      .like('constraint_name', '%conflict%');

    if (constraints && constraints.length > 0) {
      console.log('Found constraints:');
      constraints.forEach(c => {
        if (c.constraint_name.includes('per_timetable')) {
          console.log(`  ✅ ${c.constraint_name} (TIMETABLE-SPECIFIC)`);
        } else {
          console.log(`  ⚠️  ${c.constraint_name} (GLOBAL - needs fix)`);
        }
      });
    } else {
      console.log('⚠️  Could not auto-detect constraints');
      console.log('   Run this query in Supabase SQL Editor:');
      console.log();
      console.log('   SELECT conname FROM pg_constraint');
      console.log('   WHERE conrelid = \'scheduled_classes\'::regclass');
      console.log('   AND conname LIKE \'%conflict%\';');
    }

    console.log();
    console.log('='.repeat(70));
    console.log('RECOMMENDATION');
    console.log('='.repeat(70));
    console.log();

    if (timetables && timetables.length > 1) {
      const hasDrafts = timetables.some(t => t.status === 'draft');
      const hasMultipleSemesters = new Set(timetables.map(t => t.semester)).size > 1;

      if (hasDrafts && hasMultipleSemesters) {
        console.log('⚠️  You have multiple draft timetables for different semesters.');
        console.log('   If you\'re experiencing save conflicts, apply the fix:');
        console.log();
        console.log('   node apply-constraint-fix.js');
        console.log();
      } else {
        console.log('✅ Your current setup looks good!');
        console.log('   But applying the fix will prevent future conflicts.');
        console.log();
      }
    } else {
      console.log('✅ You have only one timetable - no conflicts expected.');
      console.log('   Apply the fix before creating more timetables.');
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkConstraints();
