// Check if user exists in database
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hwfdzrqfesebmuzgqmpe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3ZmR6cnFmZXNlYm11emdxbXBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODkwODc4OCwiZXhwIjoyMDc0NDg0Nzg4fQ.hlG84S_fYQ0hc8yctVXibOHLObWLrSZxGnFoOWeLrfg';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUser() {
  const email = 'naitamatharva14@gmail.com';
  
  console.log('🔍 Checking user:', email);
  
  try {
    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        role,
        is_active,
        email_verified,
        created_at,
        department_id,
        departments!users_department_id_fkey(name, code)
      `)
      .eq('email', email);

    if (userError) {
      console.error('❌ Error checking user:', userError);
      return;
    }

    if (!userData || userData.length === 0) {
      console.log('⚠️  User not found in database');
      console.log('📝 User needs to register first');
      return;
    }

    console.log('✅ User found:', userData[0]);
    
    // Check if user is active
    if (!userData[0].is_active) {
      console.log('⚠️  User exists but is inactive');
    }
    
    // Check if email is verified
    if (!userData[0].email_verified) {
      console.log('⚠️  User exists but email is not verified');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkUser();