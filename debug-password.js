require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;  
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugPassword() {
  try {
    const email = 'naitamatharva14@gmail.com';
    const testPassword = 'password123';
    
    console.log('Debugging password for:', email);
    console.log('Test password:', testPassword);
    
    // Get user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('Error fetching user:', userError);
      return;
    }

    if (!userData) {
      console.log('User not found');
      return;
    }

    console.log('\nUser found:');
    console.log('ID:', userData.id);
    console.log('Email:', userData.email);
    console.log('Password hash:', userData.password_hash);
    console.log('Hash length:', userData.password_hash?.length);

    // Test password comparison
    if (userData.password_hash) {
      const isValidPassword = await bcrypt.compare(testPassword, userData.password_hash);
      console.log('\nPassword comparison result:', isValidPassword);
      
      // Also try comparing with different variations
      const variations = [
        'password123',
        'Password123',
        'PASSWORD123',
        'password'
      ];
      
      console.log('\nTesting password variations:');
      for (const variation of variations) {
        const result = await bcrypt.compare(variation, userData.password_hash);
        console.log(`"${variation}": ${result}`);
      }
    } else {
      console.log('No password hash found for user');
    }

  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugPassword();