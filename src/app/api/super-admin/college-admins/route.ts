import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/shared/database/client';
import bcrypt from 'bcryptjs';
import { requireRoles } from '@/lib/auth';
import { getPool } from '@/lib/db';

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
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    console.log('Fetching college admins from database...');

    const pool = getPool();
    const { rows: admins } = await pool.query(`
      SELECT
        u.id, u.first_name, u.last_name, u.email,
        u.college_uid, u.college_id, u.phone, u.is_active, u.created_at,
        CASE WHEN c.id IS NOT NULL
          THEN json_build_object('id', c.id, 'name', c.name, 'code', c.code)
          ELSE NULL
        END AS college
      FROM users u
      LEFT JOIN colleges c ON c.id = u.college_id
      WHERE u.role = 'college_admin'
      ORDER BY u.created_at DESC
    `);

    console.log(`Found ${admins?.length || 0} college admins`);

    return NextResponse.json({ admins: admins || [] });

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
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

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
        id: crypto.randomUUID(),
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
