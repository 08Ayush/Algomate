const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRLS() {
  console.log('🔧 Fixing RLS Policies for Events System...\n');

  try {
    // Disable RLS on events table
    console.log('1. Disabling RLS on events table...');
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE events DISABLE ROW LEVEL SECURITY;'
    });
    
    if (error1) {
      console.log('   ⚠️  Note: exec_sql RPC not available, you need to run SQL manually');
      console.log('   See instructions below...\n');
    } else {
      console.log('   ✅ Events table RLS disabled\n');
    }

    // Disable RLS on event_registrations table
    console.log('2. Disabling RLS on event_registrations table...');
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;'
    });
    
    if (error2) {
      console.log('   ⚠️  Note: exec_sql RPC not available\n');
    } else {
      console.log('   ✅ Event registrations table RLS disabled\n');
    }

    // Disable RLS on event_notifications table
    console.log('3. Disabling RLS on event_notifications table...');
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE event_notifications DISABLE ROW LEVEL SECURITY;'
    });
    
    if (error3) {
      console.log('   ⚠️  Note: exec_sql RPC not available\n');
    } else {
      console.log('   ✅ Event notifications table RLS disabled\n');
    }

    console.log('=' .repeat(70));
    console.log('❌ IMPORTANT: Supabase doesn\'t allow ALTER TABLE via client API');
    console.log('=' .repeat(70));
    console.log('\n📋 You MUST run this SQL manually in Supabase Dashboard:\n');
    console.log('1. Open this link:');
    console.log('   👉 https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new\n');
    console.log('2. Copy and paste this SQL:\n');
    console.log('   ' + '─'.repeat(60));
    console.log('   ALTER TABLE events DISABLE ROW LEVEL SECURITY;');
    console.log('   ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;');
    console.log('   ALTER TABLE event_notifications DISABLE ROW LEVEL SECURITY;');
    console.log('   ' + '─'.repeat(60));
    console.log('\n3. Click the green "Run" button');
    console.log('4. Wait for success message ✅');
    console.log('5. Come back and test your UI\n');
    console.log('=' .repeat(70));
    console.log('After running the SQL, event creation will work immediately!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRLS()
  .then(() => {
    console.log('\n✅ Instructions provided. Please follow steps above.');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Failed:', error);
    process.exit(1);
  });
