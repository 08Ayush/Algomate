require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;  
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Check if admin already exists
    const { data: existingAdmin } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', 'admin@academic.com')
      .single();

    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }

    // Get a department for the admin
    const { data: department } = await supabaseAdmin
      .from('departments')
      .select('id, name, college_id')
      .limit(1)
      .single();

    if (!department) {
      console.log('No departments found. Please ensure departments exist first.');
      return;
    }

    console.log('Using department:', department.name);
    console.log('College ID:', department.college_id);

    // Hash password
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin user
    const { data: adminUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        first_name: 'System',
        last_name: 'Administrator',
        email: 'admin@academic.com',
        college_uid: 'ADM000001',
        password_hash: passwordHash,
        role: 'admin',
        faculty_type: null, // Admin users don't have faculty_type
        department_id: department.id,
        college_id: department.college_id, // Add college_id
        is_active: true,
        email_verified: true
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create admin user:', error);
      return;
    }

    console.log('✅ Admin user created successfully!');
    console.log('Email:', adminUser.email);
    console.log('Password:', password);
    console.log('College UID:', adminUser.college_uid);
    console.log('Department:', department.name);

  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

createAdminUser();