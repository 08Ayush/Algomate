require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;  
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserWithActiveFilter() {
  try {
    const email = 'naitamatharva14@gmail.com';
    
    console.log('Testing exact login query...');
    
    // Test the exact query used in login API
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        college_uid,
        email,
        password_hash,
        phone,
        profile_image_url,
        department_id,
        role,
        faculty_type,
        is_active,
        email_verified,
        last_login,
        created_at,
        departments!users_department_id_fkey(id, name, code)
      `)
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (userError) {
      console.error('❌ User lookup error:', userError);
      return;
    }

    if (!userData) {
      console.log('❌ No user found with email and is_active=true');
      return;
    }

    console.log('✅ User found with login query:');
    console.log('ID:', userData.id);
    console.log('Email:', userData.email);
    console.log('is_active:', userData.is_active);
    console.log('email_verified:', userData.email_verified);
    console.log('Department:', userData.departments?.name);
    console.log('Has password_hash:', !!userData.password_hash);

    // Test without is_active filter
    console.log('\n--- Testing without is_active filter ---');
    const { data: userData2, error: userError2 } = await supabaseAdmin
      .from('users')
      .select('id, email, is_active, email_verified')
      .eq('email', email)
      .single();

    if (userError2) {
      console.error('❌ User lookup error (no filter):', userError2);
      return;
    }

    console.log('User without filter:');
    console.log('ID:', userData2.id);
    console.log('Email:', userData2.email);
    console.log('is_active:', userData2.is_active);
    console.log('email_verified:', userData2.email_verified);

  } catch (error) {
    console.error('Debug error:', error);
  }
}

checkUserWithActiveFilter();