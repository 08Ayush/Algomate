import { serviceDb as supabase } from '@/shared/database';
import { NextRequest, NextResponse } from 'next/server';
import { requireRoles } from '@/lib/auth';
import { getPool } from '@/lib/db';

// GET - Fetch all registration tokens (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const pool = getPool();
    const { rows: tokens } = await pool.query(`
      SELECT
        rt.*,
        CASE WHEN dr.id IS NOT NULL
          THEN json_build_object(
            'institution_name', dr.institution_name,
            'contact_name', dr.contact_name,
            'email', dr.email,
            'phone', dr.phone
          )
          ELSE NULL
        END AS demo_request
      FROM registration_tokens rt
      LEFT JOIN demo_requests dr ON dr.id = rt.demo_request_id
      ORDER BY rt.created_at DESC
    `);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error in GET /api/super-admin/registration-tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new registration token
export async function POST(request: NextRequest) {
  try {
    const user = requireRoles(request, ['super_admin']);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const {
      institution_name,
      email,
      demo_request_id,
      expires_in_days = 30,
      created_by
    } = body;

    // Validate required fields
    if (!institution_name || !email) {
      return NextResponse.json(
        { error: 'Institution name and email are required' },
        { status: 400 }
      );
    }

    // Generate unique token
    const token = `REG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Insert token
    const { data: newToken, error } = await supabase
      .from('registration_tokens')
      .insert({
        token,
        institution_name,
        email,
        demo_request_id: demo_request_id || null,
        expires_at: expiresAt.toISOString(),
        is_used: false,
        created_by: created_by || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating token:', error);
      return NextResponse.json(
        { error: 'Failed to create registration token' },
        { status: 500 }
      );
    }

    // Generate registration URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const registrationUrl = `${baseUrl}/register?token=${token}`;

    return NextResponse.json({
      success: true,
      message: 'Registration token created successfully',
      token: newToken,
      registrationUrl
    });
  } catch (error) {
    console.error('Error in POST /api/super-admin/registration-tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
