// Test Supabase connection
const { createClient } = require('@supabase/supabase-js');

// Test environment variables - using hardcoded values from .env
const SUPABASE_URL = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwODc4OCwiZXhwIjoyMDc0NDg0Nzg4fQ.hlG84S_fYQ0hc8yctVXibOHLObWLrSZxGnFoOWeLrfg';

console.log('🔍 Testing Environment Variables:');
console.log('SUPABASE_URL:', SUPABASE_URL);
console.log('SERVICE_ROLE_KEY exists:', !!SERVICE_ROLE_KEY);

// Create admin client
const supabaseAdmin = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testConnection() {
  try {
    console.log('\n🔄 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id, name, code')
      .limit(5);
    
    if (error) {
      console.error('❌ Connection failed:', error);
      return;
    }
    
    console.log('✅ Connection successful!');
    console.log('📊 Sample departments:', data);
    console.log(`📈 Found ${data?.length || 0} departments`);
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

testConnection();