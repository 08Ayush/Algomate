import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

interface AdminWithCollege {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  college: {
    id: string;
    name: string;
    code: string;
  };
}

// GET - List all college admins
export async function GET(request: NextRequest) {
  try {
    console.log('Fetching college admins from database...');
    
    const { data: admins, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        email,
        college_uid,
        college_id,
        phone,
        is_active,
        created_at,
        college:colleges!users_college_id_fkey(
          id,
          name,
          code
        )
      `)
      .eq('role', 'college_admin')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('College admins fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch college admins', details: error.message },
        { status: 500 }
      );
    }

    console.log(`Found ${admins?.length || 0} college admins`);

    // Flatten the college object
    const transformedAdmins = admins?.map(admin => ({
      ...admin,
      college: admin.college
    })) || [];

    return NextResponse.json({ admins: transformedAdmins });

  } catch (error: any) {
    console.error('College admins API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new college admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      college_id,
      college_uid,
      password,
      is_active = true
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !email || !college_id || !college_uid || !password) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Check if college exists
    const { data: college } = await supabaseAdmin
      .from('colleges')
      .select('id')
      .eq('id', college_id)
      .single();

    if (!college) {
      return NextResponse.json(
        { error: 'College not found' },
        { status: 404 }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Check if college_uid already exists for this college
    const { data: existingUID } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('college_id', college_id)
      .eq('college_uid', college_uid)
      .single();

    if (existingUID) {
      return NextResponse.json(
        { error: 'College UID already exists for this college' },
        { status: 400 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create college admin
    const { data: newAdmin, error } = await supabaseAdmin
      .from('users')
      .insert({
        first_name,
        last_name,
        email,
        phone,
        college_id,
        college_uid,
        password_hash,
        role: 'college_admin',
        is_active,
        email_verified: true
      })
      .select()
      .single();

    if (error) {
      console.error('College admin creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create college admin' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'College admin created successfully',
      admin: newAdmin
    });

  } catch (error: any) {
    console.error('College admin creation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
