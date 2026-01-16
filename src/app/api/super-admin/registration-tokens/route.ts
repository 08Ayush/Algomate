import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Fetch all registration tokens (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const { data: tokens, error } = await supabase
      .from('registration_tokens')
      .select(`
        *,
        demo_request:demo_requests(
          institution_name,
          contact_name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch registration tokens' },
        { status: 500 }
      );
    }

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
