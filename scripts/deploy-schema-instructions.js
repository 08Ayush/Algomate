const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deploySchema() {
  console.log('🚀 Deploying Events Schema to Supabase...\n');
  console.log('📋 Instructions:\n');
  console.log('Since Supabase client cannot execute DDL statements directly,');
  console.log('you need to manually run the SQL schema in Supabase Dashboard:\n');
  console.log('1. Open: https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new');
  console.log('2. Copy the entire contents of: database/events_schema.sql');
  console.log('3. Paste into the SQL Editor');
  console.log('4. Click "Run" button');
  console.log('5. Wait for completion (should show success messages)');
  console.log('6. Come back and run: node insert-sample-events.js\n');
  
  console.log('Alternatively, here is the direct link to your project SQL Editor:');
  console.log('👉 https://app.supabase.com/project/hwfdzrqfesebmuzgqmpe/sql/new\n');
  
  console.log('━'.repeat(60));
  console.log('⚠️  IMPORTANT: Run the SQL schema first before inserting data!');
  console.log('━'.repeat(60));
}

deploySchema();
